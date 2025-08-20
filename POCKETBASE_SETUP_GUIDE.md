# PocketBase Collections Setup Guide for Taxi Buddy

This guide provides comprehensive instructions for setting up the required PocketBase collections for the Taxi Buddy application.

## Prerequisites
- PocketBase installed and running
- Admin access to the PocketBase admin interface

## Collections Overview

### 1. Users Collection (Default)
The Users collection is automatically created by PocketBase for authentication.

**Fields:**
- `id` (Text, Primary Key) - Auto-generated
- `created` (DateTime) - Auto-generated
- `updated` (DateTime) - Auto-generated
- `username` (Text, Unique) - Required
- `email` (Email, Unique) - Required
- `emailVisibility` (Bool) - Default: false
- `verified` (Bool) - Default: false
- `password` (Text) - Required
- `passwordConfirm` (Text) - Required for registration

**Settings:**
- Authentication: Enabled
- Allow username/password auth: Yes
- Allow email/password auth: Yes
- Allow OAuth2: Optional (can enable later)
- Password reset token expiration: 1 hour
- Email confirmation token expiration: 1 hour

### 2. Expense Categories Collection

**Collection Name:** `expense_categories`

**Fields:**
- `id` (Text, Primary Key) - Auto-generated
- `created` (DateTime) - Auto-generated
- `updated` (DateTime) - Auto-generated
- `name` (Text, Required) - Category name (e.g., "Fuel", "Maintenance")
- `type` (Select, Required) - Options: "expense", "income"
- `user` (Relation, Required) - Many-to-One relation to Users
- `is_default` (Bool) - Default: false (for system defaults)

**Validation Rules:**
```json
{
  "name": {
    "required": true,
    "minLength": 2,
    "maxLength": 50
  },
  "type": {
    "required": true,
    "oneOf": ["expense", "income"]
  }
}
```

**Indexes:**
- `user+name` (Unique) - Ensure unique category names per user

**Default Records:**
Create these default expense categories for new users:
- Fuel (expense)
- Maintenance (expense)
- Insurance (expense)
- Cleaning (expense)
- Parking/Tolls (expense)
- Other Expenses (expense)
- Ride Income (income)
- Tips (income)
- Other Income (income)

### 3. Expenses Collection

**Collection Name:** `expenses`

**Fields:**
- `id` (Text, Primary Key) - Auto-generated
- `created` (DateTime) - Auto-generated
- `updated` (DateTime) - Auto-generated
- `amount` (Number, Required) - Positive for income, negative for expenses
- `date` (Date, Required) - Expense/income date
- `description` (Text) - Optional description
- `category` (Relation, Required) - Many-to-One relation to expense_categories
- `trip` (Relation) - Optional Many-to-One relation to trips
- `user` (Relation, Required) - Many-to-One relation to Users
- `receipt` (File) - Optional receipt attachment

**Validation Rules:**
```json
{
  "amount": {
    "required": true,
    "min": -999999,
    "max": 999999
  },
  "date": {
    "required": true
  },
  "category": {
    "required": true
  }
}
```

**Indexes:**
- `user+date` - For filtering expenses by user and date
- `user+category` - For category-based reports

### 4. Trips Collection

**Collection Name:** `trips`

**Fields:**
- `id` (Text, Primary Key) - Auto-generated
- `created` (DateTime) - Auto-generated
- `updated` (DateTime) - Auto-generated
- `start_time` (DateTime, Required) - Trip start time
- `end_time` (DateTime) - Trip end time (optional)
- `pickup_location` (Text) - Pickup address
- `dropoff_location` (Text) - Dropoff address
- `distance` (Number) - Distance in kilometers/miles
- `fare` (Number, Required) - Total fare amount
- `platform` (Relation) - Optional Many-to-One relation to platforms
- `notes` (Text) - Additional trip notes
- `user` (Relation, Required) - Many-to-One relation to Users

**Validation Rules:**
```json
{
  "start_time": {
    "required": true
  },
  "fare": {
    "required": true,
    "min": 0
  }
}
```

**Indexes:**
- `user+start_time` - For filtering trips by user and date range

### 5. Platforms Collection

**Collection Name:** `platforms`

**Fields:**
- `id` (Text, Primary Key) - Auto-generated
- `created` (DateTime) - Auto-generated
- `updated` (DateTime) - Auto-generated
- `name` (Text, Required) - Platform name (e.g., "Uber", "Lyft", "Bolt")
- `user` (Relation, Required) - Many-to-One relation to Users
- `is_active` (Bool) - Default: true

**Validation Rules:**
```json
{
  "name": {
    "required": true,
    "minLength": 2,
    "maxLength": 50
  }
}
```

**Indexes:**
- `user+name` (Unique) - Ensure unique platform names per user

**Default Records:**
Create these default platforms:
- Uber
- Lyft
- Bolt
- Didi
- Local Taxi
- Other

## Security and Data Isolation

### Collection Permissions

For ALL collections except Users, set the following permissions:

**List Rules:**
```javascript
// Only allow users to see their own records
user = @request.auth.id
@collection.user = user
```

**View Rules:**
```javascript
// Only allow users to view their own records
user = @request.auth.id
@collection.user = user
```

**Create Rules:**
```javascript
// Users can only create records for themselves
user = @request.auth.id
@collection.user = user
```

**Update Rules:**
```javascript
// Users can only update their own records
user = @request.auth.id
@collection.user = user
```

**Delete Rules:**
```javascript
// Users can only delete their own records
user = @request.auth.id
@collection.user = user
```

### File Upload Security

For collections with file uploads (like receipts in expenses), ensure proper file validation:

```javascript
// In PocketBase file validation
files.receipt = {
  maxSize: 5242880, // 5MB max
  mimeTypes: ["image/jpeg", "image/png", "image/gif", "application/pdf"]
}
```

## Setup Steps

1. **Install and Start PocketBase**
   ```bash
   # Download and extract PocketBase
   # Run: ./pocketbase serve
   ```

2. **Create Collections**
   - Open PocketBase admin UI (usually http://127.0.0.1:8090/_/)
   - Navigate to Settings → Collections
   - Create each collection in the order listed above

3. **Configure Permissions**
   - For each collection, go to the "Permissions" tab
   - Set the rules as specified in the "Security and Data Isolation" section

4. **Create Default Records**
   - Create the default expense categories and platforms
   - These will be available to all users

5. **Test the Setup**
   - Create a test user account
   - Verify that data isolation works correctly
   - Test creating expenses, trips, and categories

## API Integration Notes

The SvelteKit application uses the following API endpoints:

- `POST /api/collections/users/auth-with-password` - User login
- `POST /api/collections/users/records` - User registration
- `GET /api/collections/expenses/records` - List expenses (with filters)
- `POST /api/collections/expenses/records` - Create expense
- `DELETE /api/collections/expenses/records/{id}` - Delete expense

All API requests automatically include user authentication and respect the data isolation rules.

## Backup and Maintenance

**Regular Backups:**
```bash
# Backup PocketBase data
./pocketbase admin backup --dir ./backups
```

**Monitoring:**
- Monitor disk space for file uploads
- Regularly check application logs
- Set up alerts for authentication failures

## Troubleshooting

**Common Issues:**
1. **Permission denied errors** - Check collection permission rules
2. **File upload failures** - Verify file size and type restrictions
3. **Relation errors** - Ensure related records exist and user has access
4. **Validation errors** - Check field validation rules

This setup provides a secure, scalable foundation for the Taxi Buddy application with proper data isolation and comprehensive expense/trip tracking capabilities.
