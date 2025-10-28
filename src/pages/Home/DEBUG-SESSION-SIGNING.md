# 🐛 Debug Guide - Session-Based PDF Signing

## Lỗi thường gặp và cách khắc phục

### ❌ Lỗi: "Failed to execute 'text' on 'Response': body stream already read"

**Nguyên nhân:**
- Code cố đọc response body 2 lần (đã được fix)
- Response body chỉ có thể đọc 1 lần duy nhất

**Giải pháp:**
- ✅ Đã được fix bằng cách sử dụng `response.clone()` trước khi đọc
- Nếu vẫn gặp lỗi này, hãy pull code mới nhất

---

### ❌ Lỗi: "FirstTimeSAD là bắt buộc"

```json
{
    "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
    "title": "One or more validation errors occurred.",
    "status": 400,
    "errors": {
        "firstTimeSAD": [
            "FirstTimeSAD là bắt buộc."
        ]
    }
}
```

**Nguyên nhân có thể:**

#### 1. Backend không trả về SAD token trong response headers

**Kiểm tra:**
- Mở Developer Tools (F12) → Tab Console
- Tìm log: `🔑 [startTransaction] SAD Token nhận được:`
- Nếu thấy `null` hoặc `undefined` → Backend không trả về header

**Giải pháp:**
- Kiểm tra backend có expose header `X-MySign-Transaction-SAD` qua CORS không?
- Trong backend .NET Core, cần thêm vào CORS policy:

```csharp
// Startup.cs hoặc Program.cs
app.UseCors(policy => policy
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader()
    .WithExposedHeaders("X-MySign-Transaction-SAD", "X-MySign-Transaction-ExpireDate") // ⭐ QUAN TRỌNG!
);
```

#### 2. Frontend không đọc được header do CORS

**Kiểm tra:**
- Xem log: `📋 [startTransaction] All response headers:`
- Nếu không thấy `X-MySign-Transaction-SAD` trong list → CORS chặn

**Giải pháp:**
- Backend phải expose headers (xem giải pháp ở mục 1)

#### 3. SAD token bị null khi truyền vào continueTransaction

**Kiểm tra:**
- Xem log: `📦 [continueTransaction] Contents:`
- Kiểm tra xem `FirstTimeSAD` có giá trị không

**Giải pháp:**
- Đảm bảo bạn lưu và truyền đúng SAD từ lần ký trước:

```typescript
const result1 = await startTransaction(...);
console.log('SAD received:', result1.sad); // Phải có giá trị

const result2 = await continueTransaction(..., {
  firstTimeSAD: result1.sad!, // ⭐ Truyền SAD từ lần trước
  ...
});
```

#### 4. Backend API endpoint không chính xác

**Kiểm tra:**
- URL đang gọi: `http://localhost:5000/api/my-sign/sign-pdf/continue-transaction`
- Đảm bảo backend đang chạy ở `localhost:5000`

**Giải pháp:**
- Thay đổi `BASE_URL` trong file `test-sign-pdf-session.ts`:

```typescript
// Nếu backend chạy ở port khác
const BASE_URL = 'http://localhost:YOUR_PORT';

// Hoặc production
const BASE_URL = 'http://171.244.49.4';
```

---

## 📝 Checklist Debug

### Bước 1: Kiểm tra startTransaction

Chạy test và kiểm tra console logs:

```
✅ Nên thấy:
🔑 [startTransaction] SAD Token nhận được: [một chuỗi dài]
✅ [startTransaction] SAD token hợp lệ, length: [số > 0]

❌ Nếu thấy:
🔑 [startTransaction] SAD Token nhận được: null
⚠️ [startTransaction] CẢNH BÁO: Không nhận được SAD token
```

**Nếu thấy warning:** Backend không trả về SAD token → Fix CORS (xem mục 1)

### Bước 2: Kiểm tra continueTransaction

```
✅ Nên thấy:
✅ [continueTransaction] FirstTimeSAD hợp lệ, length: [số > 0]
📦 [continueTransaction] Contents:
  FirstTimeSAD: [giá trị SAD]

❌ Nếu thấy:
usingSAD: NULL/UNDEFINED
❌ [continueTransaction] FirstTimeSAD bị null, undefined hoặc rỗng!
```

**Nếu thấy error:** SAD không được truyền đúng → Kiểm tra logic truyền SAD

### Bước 3: Kiểm tra Backend Response

Nếu request được gửi nhưng bị lỗi 400:

```
❌ [continueTransaction] Error response from server: {...}
📋 [continueTransaction] Validation errors: {...}
```

Xem chi tiết error trong console để biết field nào bị thiếu.

---

## 🔧 Quick Fixes

### Fix 1: Thêm CORS Headers (Backend)

**File: `Program.cs` hoặc `Startup.cs`**

```csharp
// BEFORE
app.UseCors(policy => policy
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader()
);

// AFTER - Thêm WithExposedHeaders
app.UseCors(policy => policy
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader()
    .WithExposedHeaders(
        "X-MySign-Transaction-SAD", 
        "X-MySign-Transaction-ExpireDate"
    )
);
```

### Fix 2: Kiểm tra backend controller trả về headers đúng

**File: `MySignController.cs` (Backend)**

```csharp
// Trong method StartTransaction
Response.Headers.Add("X-MySign-Transaction-SAD", sadToken);
Response.Headers.Add("X-MySign-Transaction-ExpireDate", expireDate.ToString("o"));

// Đảm bảo return file sau khi đã set headers
return File(pdfBytes, "application/pdf", fileName);
```

### Fix 3: Alternative - Trả SAD trong response body

Nếu không thể expose headers qua CORS, có thể thay đổi cách trả về:

**Backend:**
```csharp
// Thay vì return File, return JSON
return Ok(new {
    sad = sadToken,
    expireDate = expireDate,
    pdfBase64 = Convert.ToBase64String(pdfBytes)
});
```

**Frontend (modify `startTransaction`):**
```typescript
const json = await response.json();
const blob = base64ToBlob(json.pdfBase64, 'application/pdf');

return {
    blob,
    sad: json.sad,
    expireDate: json.expireDate
};
```

---

## 📞 Vẫn không fix được?

1. **Kiểm tra backend logs** để xem có nhận được `FirstTimeSAD` không
2. **Test với Postman/Thunder Client** để đảm bảo API hoạt động đúng
3. **Kiểm tra network tab** trong DevTools:
   - Tab Network → Tìm request `continue-transaction`
   - Xem tab "Headers" → "Request Payload"
   - Đảm bảo có field `FirstTimeSAD` với giá trị

---

## 🎯 Expected Behavior (Hành vi đúng)

### Lần ký đầu tiên (startTransaction)

```
Console logs:
🔧 [startTransaction] Bắt đầu phiên ký...
📡 [startTransaction] Gửi request đến: http://localhost:5000/api/my-sign/sign-pdf/start-transaction
📋 [startTransaction] All response headers:
  content-type: application/pdf
  x-mysign-transaction-sad: YOUR_SAD_TOKEN_HERE
  x-mysign-transaction-expiredate: 2025-10-27T...
🔑 [startTransaction] SAD Token nhận được: YOUR_SAD_TOKEN_HERE
✅ [startTransaction] SAD token hợp lệ, length: 128
✅ [startTransaction] Ký thành công! Blob size: 123456
```

### Lần ký tiếp theo (continueTransaction)

```
Console logs:
🔧 [continueTransaction] Tiếp tục ký trong phiên...
  usingSAD: YOUR_SAD_TOKEN_HERE...
✅ [continueTransaction] FirstTimeSAD hợp lệ, length: 128
📦 [continueTransaction] Contents:
  FileUpload: [File] document.pdf (45678 bytes)
  FirstTimeSAD: YOUR_SAD_TOKEN_HERE
  Reason: Phê duyệt hợp đồng
  Location: Hà Nội
📡 [continueTransaction] Gửi request đến: http://localhost:5000/api/my-sign/sign-pdf/continue-transaction
🔑 [continueTransaction] SAD Token mới: NEW_SAD_TOKEN_HERE
✅ [continueTransaction] Ký thành công mà KHÔNG CẦN xác thực! Blob size: 234567
```

---

**Last updated:** 2025-10-27

