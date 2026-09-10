# OctaPoint — chạy nhanh trên Windows / VS Code

## Cách dễ nhất: Docker Desktop

1. Cài **Docker Desktop** và mở Docker Desktop cho đến khi trạng thái là Running.
2. Giải nén project, mở thư mục `octapoint` bằng VS Code.
3. Mở Terminal trong VS Code tại thư mục có file `docker-compose.yml`.
4. Chạy:

```powershell
docker compose up --build
```

Lần đầu Docker phải tải image/package nên có thể mất vài phút.

Khi log ổn định, mở:

- Merchant Portal: http://localhost:3000
- Admin Portal: http://localhost:3001
- API health: http://localhost:4000/health
- MCP health: http://localhost:4100/health

Demo tự tạo sẵn:

- Merchant ID: `00000000-0000-4000-8000-000000000001`
- Demo user: `demo_user_1`
- Số dư sau seed: 380 credits (issue 500, redeem 120)

Dừng hệ thống:

```powershell
Ctrl + C
docker compose down
```

Xóa luôn dữ liệu demo để chạy sạch lại:

```powershell
docker compose down -v
```

## Nếu PowerShell chặn npm

Chạy một lần:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

hoặc dùng `npm.cmd` thay cho `npm`.

## Kiểm tra build khi chạy không dùng Docker

Sau khi cài Node.js và có PostgreSQL + Redis:

```powershell
copy .env.example .env
npm install
npm run build:all
npm run check:static
```

Mặc định project chạy `CHAIN_MODE=offchain`, vì vậy không cần Sui/Enoki/Walrus thật để demo. Chỉ bật `CHAIN_MODE=onchain` sau khi đã deploy Move contract và điền đầy đủ object IDs/secret tương ứng.
