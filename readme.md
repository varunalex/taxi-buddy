# Taxi Buddy - Driver Companion App (AI generated)

A comprehensive web application for taxi drivers to track their income and expenses, built with SvelteKit 5 and TypeScript.

## Features

- **Trip Management**: Track trips with details like distance, duration, fare, and tips
- **Expense Tracking**: Categorize and monitor expenses (fuel, maintenance, etc.)
- **Income Reports**: Generate detailed income and expense reports
- **Platform Integration**: Support for multiple ride-sharing platforms
- **Authentication**: Secure user authentication with PocketBase

## Tech Stack

- **Frontend**: SvelteKit 5 + TypeScript
- **Styling**: Tailwind CSS
- **Backend**: PocketBase (embedded database + auth)
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ 
- PocketBase (local installation or Docker)

### Installation

1. Clone the repository
2. Install dependencies:
```sh
npm install
```

3. Start the development server:
```sh
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## PocketBase Setup Guide

### Installation

1. Download PocketBase from [pocketbase.io](https://pocketbase.io/)
2. Start PocketBase:
```sh
./pocketbase serve
```
3. Access the admin interface at `http://127.0.0.1:8090/_/`

### Database Collections Setup

Create the following collections in PocketBase:

#### 1. Users Collection (Built-in)
PocketBase automatically manages the `users` collection for authentication.

#### 2. Trips Collection
- **Name**: `trips`
- **Type**: Base collection

**Fields:**
- `date` (Text) - Trip date (YYYY-MM-DD format)
- `start_time` (Text) - Start time (HH:MM format)
- `duration` (Number) - Duration in minutes
- `distance` (Number) - Distance in kilometers
- `fuel_used` (Number) - Fuel used in liters
- `fare` (Number) - Base fare amount
- `tips` (Number) - Tips received
- `platform` (Text) - Platform name (Uber, Lyft, etc.)
- `notes` (Text) - Additional notes
- `user_id` (Relation) → users.id

#### 3. Expense Categories Collection
- **Name**: `expense_categories`
- **Type**: Base collection

**Fields:**
- `name` (Text) - Category name
- `type` (Text) - "income" or "expense"
- `color` (Text) - Hex color code (optional)
- `icon` (Text) - Icon name (optional)
- `is_default` (Boolean) - Default category flag
- `user_id` (Relation) → users.id

#### 4. Expenses Collection
- **Name**: `expenses`
- **Type**: Base collection

**Fields:**
- `amount` (Number) - Expense amount
- `category_id` (Relation) → expense_categories.id
- `date` (Text) - Expense date (YYYY-MM-DD format)
- `description` (Text) - Expense description
- `trip_id` (Relation) → trips.id (optional)
- `user_id` (Relation) → users.id

#### 5. Platforms Collection
- **Name**: `platforms`
- **Type**: Base collection

**Fields:**
- `name` (Text) - Platform name
- `user_id` (Relation) → users.id

## API Rules and Security

### Authentication Rules

All collections should have the following access rules:

#### Public Access (for authentication endpoints only)
- `users` collection: Allow public access for registration and login

#### Authenticated User Access
All other collections should require authentication:

```javascript
// Example rule for trips collection
@request.auth.id != "" && user_id = @request.auth.id
```

### Collection API Rules

#### Trips Collection Rules
- **List**: Authenticated users can only view their own trips
- **View**: Users can only view their own trips
- **Create**: Authenticated users can create trips (auto-assign user_id)
- **Update**: Users can only update their own trips
- **Delete**: Users can only delete their own trips

**Rule Expression:**
```javascript
user_id = @request.auth.id
```

#### Expenses Collection Rules
- **List**: Users can only view their own expenses
- **View**: Users can only view their own expenses
- **Create**: Authenticated users can create expenses (auto-assign user_id)
- **Update**: Users can only update their own expenses
- **Delete**: Users can only delete their own expenses

**Rule Expression:**
```javascript
user_id = @request.auth.id
```

#### Expense Categories Rules
- **List**: Users can view all categories (including default ones)
- **View**: Public read access for default categories, user-specific for custom
- **Create**: Authenticated users can create custom categories
- **Update**: Users can only update their own categories
- **Delete**: Users can only delete their own categories

**Rule Expression for custom categories:**
```javascript
user_id = @request.auth.id || is_default = true
```

#### Platforms Collection Rules
- **List**: Users can view all platforms (including default ones)
- **View**: Public read access for default platforms, user-specific for custom
- **Create**: Authenticated users can create custom platforms
- **Update**: Users can only update their own platforms
- **Delete**: Users can only delete their own platforms

**Rule Expression for custom platforms:**
```javascript
user_id = @request.auth.id
```

### Default Data Setup

Create default expense categories:
- **Income Categories**: Fares, Tips, Bonuses
- **Expense Categories**: Fuel, Maintenance, Insurance, Tolls, Parking, Cleaning

Create default platforms:
- Pickme, Uber

### Environment Configuration

Update the PocketBase URL in `src/lib/pocketbase.ts`:

```typescript
export const POCKETBASE_URL = 'http://127.0.0.1:8090/'; // Local development
// or
export const POCKETBASE_URL = 'https://your-pocketbase-instance.com/'; // Production
```

## Development

```sh
npm run dev
```

## Building for Production

```sh
npm run build
```

## Preview Production Build

```sh
npm run preview
```

## Docker Deployment

This application is containerized and can be deployed using Docker.

### Building the Docker Image

```sh
# Build the image
docker build -t taxi-buddy .

# Run the container
docker run -p 3000:3000 taxi-buddy
```

### Using Docker Compose

```sh
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### GitHub Container Registry (ghcr.io)

The application includes GitHub Actions workflow for automated builds and pushes to GitHub Container Registry.

#### Manual Push to ghcr.io

1. Build and tag the image:
```sh
docker build -t ghcr.io/your-username/taxi-buddy:latest .
```

2. Login to GitHub Container Registry:
```sh
echo $GHCR_TOKEN | docker login ghcr.io -u your-username --password-stdin
```

3. Push the image:
```sh
docker push ghcr.io/your-username/taxi-buddy:latest
```

#### Automated GitHub Actions

The workflow automatically builds and pushes images on:
- Push to main/master branches
- Tag pushes (v* tags)
- Pull requests (builds only, no push)

### Production Deployment

For production deployment with Docker:

1. **Pull the image** from ghcr.io:
```sh
docker pull ghcr.io/your-username/taxi-buddy:latest
```

2. **Run the container**:
```sh
docker run -d \
  --name taxi-buddy \
  -p 3000:3000 \
  -e NODE_ENV=production \
  --restart unless-stopped \
  ghcr.io/your-username/taxi-buddy:latest
```

3. **Use with reverse proxy** (nginx example):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### PocketBase Deployment with Docker

For production deployment with PocketBase, consider using the official Docker image:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  taxi-buddy:
    image: ghcr.io/your-username/taxi-buddy:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    depends_on:
      - pocketbase

  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb_data
    restart: unless-stopped
```

## Environment Variables

For production deployment, you may need to set:

- `NODE_ENV`: Set to "production"
- `POCKETBASE_URL`: URL of your PocketBase instance (if different from default)

## Security Considerations

1. Always use HTTPS in production
2. Implement proper CORS settings in PocketBase
3. Regularly update PocketBase to the latest version
4. Use strong password policies
5. Implement rate limiting for API endpoints
6. Regularly backup your PocketBase database
7. Use Docker security best practices (non-root user, read-only filesystem, etc.)

## Troubleshooting

### Common Issues

1. **CORS Errors**: Configure CORS in PocketBase admin settings
2. **Authentication Issues**: Verify PocketBase URL and user credentials
3. **API Rule Violations**: Check collection access rules in PocketBase admin

### Getting Help

- Check the [PocketBase Documentation](https://pocketbase.io/docs/)
- Review [SvelteKit Documentation](https://svelte.dev/docs/kit)
- Check the browser console for error messages
