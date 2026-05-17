# Firestore Security Specification - Salary & Attendance Tracker

## Data Invariants
1. All records (Salary, Attendance, Accuracy) MUST be associated with the authenticated user's `userId`.
2. Attendance and Accuracy records MUST have valid dates in `YYYY-MM-DD` format and months in `YYYY-MM` format.
3. Salary amounts must be positive numbers.
4. Users can only read and write their own data.

## The "Dirty Dozen" Payloads (Unauthorized Attempts)

1. **Identity Spoofing (Create)**: Creating an attendance record for another user.
   ```json
   { "userId": "attacker_id", "date": "2026-04-19", "status": "present", "month": "2026-04" }
   ```
2. **Identity Spoofing (Update)**: Changing the `userId` of an existing record.
   ```json
   { "userId": "victim_id", "date": "2026-04-19", "status": "present", "month": "2026-04" }
   ```
3. **Ghost Field Injection**: Adding unvalidated fields to a user profile.
   ```json
   { "name": "John", "username": "john123", "isAdmin": true }
   ```
4. **Invalid Type Injection**: Sending a string for a salary amount.
   ```json
   { "userId": "user123", "amount": "one thousand", "updatedAt": "server_timestamp" }
   ```
5. **Path Poisoning**: Using a massive string as a document ID.
   ```json
   { "id": "A".repeat(1024) }
   ```
6. **Negative Salary**: Setting salary to a negative value.
   ```json
   { "userId": "user123", "amount": -100, "updatedAt": "server_timestamp" }
   ```
7. **Invalid Date Format**: Using an incorrect date string.
   ```json
   { "userId": "user123", "date": "19-04-2026", "status": "present" }
   ```
8. **Malicious Enum Value**: Setting attendance status to something other than 'present' or 'off-day'.
   ```json
   { "userId": "user123", "date": "2026-04-19", "status": "vacation" }
   ```
9. **PII Blanket Read**: Attempting to list all users without being the owner.
   ```json
   // Query: db.collection('users').get()
   ```
10. **Resource Exhaustion**: Sending an extremely long name.
    ```json
    { "name": "A".repeat(5000), "username": "john" }
    ```
11. **Client-Side Timestamp Guessing**: Sending a manual timestamp instead of `request.time`.
    ```json
    { "updatedAt": "2020-01-01T00:00:00Z" }
    ```
12. **Cross-User Data Access**: Attempting to 'get' another user's salary settings.
    ```json
    // get(/databases/$(db)/documents/salary_settings/other_user_uid)
    ```

## Test Expectations
All above payloads MUST result in `PERMISSION_DENIED`.
