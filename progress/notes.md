## the seed for the master

```sql
insert into "users" ("username", "name", "mobile", "email", "country", "dialCode", "sponsor", "position", "leftUser", "rightUser", "isActive", "wallet", "redeemedTimes", "associatedUsersCount", "sponsorCode", "passwordHash", "role", "permissions", "createdAt", "updatedAt") overriding system value values ('AL00000001', 'Master', '6239658686', 'master@1as.in', 'INDIA', '91', 'AL00000001', 'LEFT', null, null, true, default, 0, 0, 'MASTER', null, 'ADMIN', default, default, default);
```
