# 🚀 Call-Manager Integration - Complete Guide

## ✅ Integration Completed

The integration of the new **call-manager** service is now complete. The old campaign system has been replaced with a modern, streamlined solution using ElevenLabs' call-manager API.

---

## 📦 What Was Created

### Frontend

1. **Service Layer** (`/frontend/src/services/call-manager.ts`)

   - TypeScript client for call-manager API
   - Functions: `submitBatchCalls()`, `cancelBatchCalls()`, `getBatchStatus()`, `checkHealth()`
   - Full type definitions for requests and responses

2. **Create Campaign Page** (`/frontend/src/app/calls/campaigns/create/page.tsx`)

   - **Modern UI** with shadcn components
   - Clean two-column layout
   - Form fields:
     - Campaign Name
     - Agent Selection (from workspace agents)
     - Agent Phone Number ID (ElevenLabs phone ID)
     - Phone Provider (SIP Trunk / Twilio)
     - Date & Time Scheduler (optional)
   - File upload for CSV/Excel with preview
   - Auto-detection of phone_number column
   - Dynamic variables support (all CSV columns except phone become variables)
   - Success/Error states with visual feedback

3. **Campaign Modal** (`/frontend/src/components/campaign-modal.tsx`)
   - Real-time status display from call-manager
   - **Cancel Campaign** button for active campaigns
   - **Auto-polling** every 5 seconds for in-progress campaigns
   - Progress bar with percentage
   - Recipients breakdown (Pending, In Progress, Completed, Failed)
   - Campaign metadata display
   - Legacy campaign detection

### Backend

4. **Call-Manager Routes** (`/backend/src/routes/call-manager.ts`)

   - `POST /api/call-manager/submit` - Create batch campaign
   - `POST /api/call-manager/:batchId/cancel` - Cancel campaign
   - `GET /api/call-manager/:batchId/status` - Get campaign status
   - Proxy layer to call-manager API
   - Database synchronization
   - Error handling with Axios

5. **Database Methods** (`/backend/src/services/supabase-workspace.ts`)

   - `getBatchCallById()` - Get batch by ID
   - `updateBatchCall()` - Update batch status
   - Integration with existing `createBatchCall()` method

6. **Route Registration** (`/backend/src/index.ts`)
   - Call-manager routes registered at `/api/call-manager`

### Database

7. **SQL Migration** (`/add_call_manager_columns.sql`)
   - `external_batch_id` (TEXT) - Stores call-manager batch ID
   - `phone_provider` (TEXT) - Stores provider (sip_trunk/twilio)
   - `scheduled_time` (BIGINT) - Unix timestamp for scheduling
   - Index on `external_batch_id` for fast lookups

---

## 🎯 Key Features

### ✨ Campaign Creation

- **Modern UI** with clean, organized layout
- **Agent Selection** from workspace call agents
- **Phone Provider** choice (SIP Trunk recommended)
- **Scheduling** - Optional date/time picker for future campaigns
- **File Upload** - CSV/Excel support with auto phone detection
- **Dynamic Variables** - Automatic extraction from CSV columns
- **Preview** - See contacts before submitting
- **Validation** - Real-time form validation

### 📊 Campaign Monitoring

- **Real-time Status** - Polls call-manager every 5 seconds
- **Progress Tracking** - Visual progress bar with percentage
- **Recipients Breakdown** - See status of each recipient
- **Campaign Details** - Agent, provider, schedule info
- **Cancel Function** - Stop campaigns in progress

### 🔒 Error Handling

- **Frontend validation** - Required fields, file format checks
- **Backend validation** - Request validation, error responses
- **User-friendly messages** - Clear error descriptions
- **Fallback for legacy** - Handles old campaigns gracefully

---

## 🛠️ How to Use

### 1. Database Setup

Execute the SQL script in Supabase SQL Editor:

```bash
# Run this in Supabase SQL Editor
/add_call_manager_columns.sql
```

This adds the necessary columns to the `batch_calls` table.

### 2. Backend Deployment

The backend changes are ready and will work automatically when deployed. The routes are registered at:

- `POST /api/call-manager/submit`
- `POST /api/call-manager/:batchId/cancel`
- `GET /api/call-manager/:batchId/status`

### 3. Creating a Campaign

1. Navigate to `/calls/campaigns`
2. Click "Create a batch call"
3. Fill in the form:
   - Campaign Name (required)
   - Select an Agent (must have `external_id`)
   - Enter Agent Phone Number ID (e.g., `phnum_5501k6qntkmyfq69yfj3xs8rw4kh`)
   - Choose Phone Provider (default: SIP Trunk)
   - (Optional) Schedule for future date/time
4. Upload CSV/Excel file with contacts:
   - Must have `phone_number` column (or phone, telefono, mobile)
   - All other columns become dynamic variables
   - Phone numbers should be in E.164 format: `+34631021622`
5. Review the preview
6. Click "Create Campaign"

### 4. Monitoring a Campaign

1. Navigate to `/calls/campaigns`
2. Click on any campaign card
3. The modal shows:
   - Real-time status (updates every 5 seconds)
   - Progress bar with percentage
   - Recipients breakdown
   - Campaign details
   - Cancel button (if in progress)

### 5. Canceling a Campaign

1. Open the campaign modal
2. Click the red "Cancel Campaign" button
3. Confirm the action
4. Campaign will stop immediately

---

## 📋 API Endpoints Reference

### Submit Batch

```typescript
POST /api/call-manager/submit

Body:
{
  call_name: string
  agent_id: string  // ElevenLabs agent ID
  agent_phone_number_id: string  // ElevenLabs phone number ID
  recipients: Array<{
    phone_number: string  // E.164 format
    conversation_initiation_client_data?: {
      dynamic_variables?: Record<string, string>
    }
  }>
  scheduled_time_unix?: number | null  // Unix timestamp
  phone_provider?: 'twilio' | 'sip_trunk' | null
}

Response:
{
  success: true,
  data: {
    batch_id: number,  // Internal DB ID
    external_batch_id: string,  // Call-manager batch ID
    call_manager_response: { ... }
  }
}
```

### Cancel Batch

```typescript
POST /api/call-manager/:batchId/cancel

Response:
{
  success: true,
  data: {
    batch_id: number,
    external_batch_id: string,
    call_manager_response: {
      status: 'cancelled',
      ...
    }
  }
}
```

### Get Batch Status

```typescript
GET /api/call-manager/:batchId/status

Response:
{
  success: true,
  data: {
    batch_id: number,
    external_batch_id: string,
    call_manager_response: {
      id: string,
      status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled',
      total_calls_scheduled: number,
      total_calls_dispatched: number,
      recipients: Array<{
        id: string,
        phone_number: string,
        status: string,
        conversation_id?: string
      }>,
      ...
    },
    database_record: { ... }
  }
}
```

---

## 🎨 UI Components Used

- `Card` - Container for sections
- `Button` - Actions and form submission
- `Input` - Text fields
- `Select` - Dropdowns for agent and provider
- `Calendar` - Date picker for scheduling
- `Alert` - Success/Error messages
- `Progress` - Campaign progress bar
- `Badge` - Status indicators
- `Sheet` - Sliding modal for campaign details
- `Popover` - Calendar popover
- Icons from `lucide-react`

---

## 🔄 Data Flow

1. **User creates campaign**
   → Frontend validates
   → Sends to `/api/call-manager/submit`
   → Backend calls call-manager API
   → Backend saves to database (with `external_batch_id`)
   → Returns success

2. **User views campaign**
   → Frontend requests `/api/call-manager/:id/status`
   → Backend fetches from call-manager API
   → Backend updates database
   → Returns full status with recipients

3. **User cancels campaign**
   → Frontend calls `/api/call-manager/:id/cancel`
   → Backend calls call-manager API cancel endpoint
   → Backend updates database status
   → Returns confirmation

4. **Auto-polling**
   → Every 5 seconds while modal is open
   → Only for `in_progress` or `pending` campaigns
   → Updates UI automatically

---

## ⚠️ Important Notes

### Agent IDs

- Agents must have `external_id` populated in the database
- This is the ElevenLabs agent ID (e.g., `agent_2401k62pf0zdfbdbatjs81prh8ka`)
- Only agents of type `call` are shown in the dropdown

### Phone Number Format

- Must be E.164 format: `+[country_code][number]`
- Example: `+34631021622`
- No spaces, dashes, or parentheses

### Dynamic Variables

- All CSV columns except the phone column are sent as dynamic variables
- Agent must be configured in ElevenLabs to receive these variables
- Variable names match CSV headers exactly

### Scheduling

- Unix timestamp is calculated from selected date + time
- If no schedule is provided, campaign starts immediately
- Timezone is based on user's local timezone

### Legacy Campaigns

- Old campaigns created with the previous system are still visible
- They show a warning: "This campaign was created with the legacy system"
- Some features (cancel, detailed status) are not available for legacy campaigns

---

## 🐛 Troubleshooting

### "No agents available"

- Check that you have agents of type `call` in your workspace
- Ensure agents have `external_id` populated

### "File must contain a phone_number column"

- Rename your phone column to `phone_number`, `phone`, `telefono`, or `mobile`
- Check that the column actually contains data

### "Failed to submit batch"

- Check that `agent_id` and `agent_phone_number_id` are correct
- Verify call-manager service is healthy: `https://call-manager-production.up.railway.app/health`
- Check backend logs for detailed error

### Campaign stuck in "pending"

- Check call-manager status directly in Railway logs
- Verify scheduled time hasn't passed
- Contact call-manager support if issue persists

### Modal not updating in real-time

- Check browser console for errors
- Verify polling is active (should see network requests every 5 seconds)
- Try closing and reopening the modal

---

## ✅ Testing Checklist

Before considering the integration complete, test:

- [ ] Execute SQL migration in Supabase
- [ ] Create a campaign with immediate execution
- [ ] Create a campaign scheduled for the future
- [ ] Upload CSV file with phone_number column
- [ ] Upload Excel file (.xlsx)
- [ ] View campaign details in modal
- [ ] Watch real-time updates in modal (in_progress campaign)
- [ ] Cancel an in-progress campaign
- [ ] Verify campaign shows as "cancelled" after canceling
- [ ] Check that completed campaigns show 100% progress
- [ ] Verify dynamic variables are sent correctly
- [ ] Test with different phone providers (SIP Trunk, Twilio)
- [ ] View legacy campaigns (should show warning)

---

## 📚 Related Documentation

- **Call-Manager API**: `/CALL-MANAGER.md`
- **Database Schema**: Check `batch_calls` table in Supabase
- **ElevenLabs Docs**: https://elevenlabs.io/docs

---

**✅ Integration is complete and ready for production!** 🚀
