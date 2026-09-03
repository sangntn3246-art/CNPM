# OctaPoint

Nền tảng Credit-as-a-Service OctaPoint gồm backend C# ASP.NET Core Web API và merchant web portal Next.js.

## Yêu cầu

- .NET SDK 10.0+
- Node.js 22+
- npm 10+

## Khởi động backend

```powershell
dotnet restore OctaPoint.slnx
dotnet run --project OctaPoint.Api
```

API mặc định chạy tại `https://localhost:7229` và `http://localhost:5074`.

Health check: `GET http://localhost:5074/health`

## Khởi động frontend

```powershell
Set-Location octapoint-web
npm.cmd ci
npm.cmd run dev
```

Frontend mặc định chạy tại `http://localhost:3000`.

## Kiểm tra trước khi push

```powershell
dotnet build OctaPoint.slnx
Set-Location octapoint-web
npm.cmd run lint
npm.cmd run build
```

## Cấu trúc repository

```text
OctaPoint.Api/                    Backend ASP.NET Core
  Controllers/                    HTTP boundary controllers
  Application/Controls/            Các lớp điều khiển use case
  Application/Contracts/           Request context và response contract
  Domain/                          Quy tắc credit, tenant, campaign, audit
  Infrastructure/                 Adapter blockchain và persistence
octapoint-web/                    Frontend Next.js
Backend-Control-Classes.md        Thiết kế backend control classes
.github/workflows/ci.yml          Pipeline kiểm tra tự động
```

Các control hiện là skeleton có thể biên dịch. Những phần tích hợp PostgreSQL, Redis, Sui, Walrus, Stripe, RBAC và HMAC sẽ được triển khai trong các task tiếp theo.