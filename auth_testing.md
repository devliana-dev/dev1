# Auth Testing Playbook — CirebonKarir.com

## MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, unique index on users.email.

## API Testing
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"muhamadwahid.sih@gmail.com","password":"admin123"}'
cat cookies.txt
curl -b cookies.txt http://localhost:8001/api/auth/me
```
Login returns `{user, token}` and sets `access_token` httpOnly cookie. `/auth/me` works with cookie or `Authorization: Bearer <token>`.

## Roles & Demo Accounts
- admin: muhamadwahid.sih@gmail.com / admin123
- candidate: budi@example.com / password123
- company: demo@perusahaan.com / password123

## Protected routes
- /api/candidate/* → role candidate
- /api/company/* → role company
- /api/admin/* → role admin
Unauthorized role returns 403; no token returns 401.
