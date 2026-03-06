# Service Creation Form Enhancements

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the provider service creation/edit form with multi-photo gallery, availability scheduling, service area, booking constraints, tags, inclusions, lead time, and save-as-draft.

**Architecture:** Frontend-heavy changes. The DB already supports multi-photo (`service_image` with `si_order`, `si_is_primary`) and availability scheduling (full `service_availability` table + REST API). We add new DB columns for the missing fields, then build the UI in `ServiceFormTab.tsx` using collapsible sections to keep the form manageable.

**Tech Stack:** React Native, TypeScript, Express.js, MySQL, existing `apiClient` + `useQuery`/`useMutation`

---

## Database Changes Summary

New columns on `service` table:
- `s_travel_radius_km` INT DEFAULT NULL
- `s_min_booking_hours` DECIMAL(4,1) DEFAULT NULL
- `s_max_booking_hours` DECIMAL(4,1) DEFAULT NULL
- `s_lead_time_days` INT DEFAULT 0
- `s_tags` JSON DEFAULT NULL (array of strings)
- `s_inclusions` JSON DEFAULT NULL (array of strings)
- `s_status` ENUM('draft','active','inactive') DEFAULT 'active'

No new tables needed. Tags and inclusions use JSON columns (simple string arrays, no relational queries needed).

---

### Task 1: Database Migration — New Service Columns

**Files:**
- Create: `server/migrations/20260306000000_service_form_enhancements.js`

**Step 1: Write the migration file**

```javascript
// server/migrations/20260306000000_service_form_enhancements.js
const db = require('../db');

async function up() {
  const conn = await db.getConnection();
  try {
    // Add new columns to service table
    const columns = [
      "ADD COLUMN IF NOT EXISTS `s_travel_radius_km` INT DEFAULT NULL AFTER `s_address`",
      "ADD COLUMN IF NOT EXISTS `s_min_booking_hours` DECIMAL(4,1) DEFAULT NULL AFTER `s_duration`",
      "ADD COLUMN IF NOT EXISTS `s_max_booking_hours` DECIMAL(4,1) DEFAULT NULL AFTER `s_min_booking_hours`",
      "ADD COLUMN IF NOT EXISTS `s_lead_time_days` INT DEFAULT 0 AFTER `s_max_booking_hours`",
      "ADD COLUMN IF NOT EXISTS `s_tags` JSON DEFAULT NULL AFTER `s_lead_time_days`",
      "ADD COLUMN IF NOT EXISTS `s_inclusions` JSON DEFAULT NULL AFTER `s_tags`",
    ];

    for (const col of columns) {
      try {
        await conn.query(`ALTER TABLE service ${col}`);
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
      }
    }

    // Change s_is_active to s_status enum (draft/active/inactive)
    // First check if s_status already exists
    const [cols] = await conn.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='service' AND COLUMN_NAME='s_status'"
    );
    if (cols.length === 0) {
      await conn.query(`
        ALTER TABLE service
        ADD COLUMN s_status ENUM('draft','active','inactive') NOT NULL DEFAULT 'active' AFTER s_is_active
      `);
      // Migrate existing data
      await conn.query("UPDATE service SET s_status = CASE WHEN s_is_active = 1 THEN 'active' ELSE 'inactive' END");
    }

    console.log('Migration 20260306000000_service_form_enhancements: UP complete');
  } finally {
    conn.release();
  }
}

async function down() {
  const conn = await db.getConnection();
  try {
    const columns = [
      's_travel_radius_km', 's_min_booking_hours', 's_max_booking_hours',
      's_lead_time_days', 's_tags', 's_inclusions', 's_status'
    ];
    for (const col of columns) {
      try {
        await conn.query(`ALTER TABLE service DROP COLUMN ${col}`);
      } catch (err) {
        // ignore if column doesn't exist
      }
    }
    console.log('Migration 20260306000000_service_form_enhancements: DOWN complete');
  } finally {
    conn.release();
  }
}

module.exports = { up, down };
```

**Step 2: Run the migration**

```bash
cd server && node -e "require('./migrations/20260306000000_service_form_enhancements').up().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })"
```

Expected: `Migration 20260306000000_service_form_enhancements: UP complete`

**Step 3: Verify columns exist**

```bash
cd server && node -e "const db = require('./db'); db.query('DESCRIBE service').then(([r]) => { r.forEach(c => console.log(c.Field, c.Type)); process.exit(0); })"
```

Expected: Should show `s_travel_radius_km`, `s_min_booking_hours`, `s_max_booking_hours`, `s_lead_time_days`, `s_tags`, `s_inclusions`, `s_status` in the output.

**Step 4: Commit**

```bash
git add server/migrations/20260306000000_service_form_enhancements.js
git commit -m "feat: add service form enhancement columns (travel radius, booking hours, lead time, tags, inclusions, status)"
```

---

### Task 2: Backend — Update Service Create/Update to Accept New Fields

**Files:**
- Modify: `server/svc/serviceService.js` (createService + updateService functions)
- Modify: `server/controllers/serviceController.js` (validation)

**Step 1: Update serviceController.js validation**

In `createService` validation (around line 116-133), add optional field validation:

```javascript
// Add these to the existing validation in createService:
if (data.travelRadiusKm !== undefined && data.travelRadiusKm !== null) {
  const radius = parseInt(data.travelRadiusKm);
  if (isNaN(radius) || radius < 0 || radius > 500) {
    return res.status(400).json({ error: 'travelRadiusKm must be 0-500' });
  }
}
if (data.minBookingHours !== undefined && data.minBookingHours !== null) {
  const min = parseFloat(data.minBookingHours);
  if (isNaN(min) || min < 0.5 || min > 24) {
    return res.status(400).json({ error: 'minBookingHours must be 0.5-24' });
  }
}
if (data.maxBookingHours !== undefined && data.maxBookingHours !== null) {
  const max = parseFloat(data.maxBookingHours);
  if (isNaN(max) || max < 1 || max > 720) {
    return res.status(400).json({ error: 'maxBookingHours must be 1-720' });
  }
}
if (data.leadTimeDays !== undefined && data.leadTimeDays !== null) {
  const days = parseInt(data.leadTimeDays);
  if (isNaN(days) || days < 0 || days > 90) {
    return res.status(400).json({ error: 'leadTimeDays must be 0-90' });
  }
}
if (data.tags && !Array.isArray(data.tags)) {
  return res.status(400).json({ error: 'tags must be an array of strings' });
}
if (data.inclusions && !Array.isArray(data.inclusions)) {
  return res.status(400).json({ error: 'inclusions must be an array of strings' });
}
```

**Step 2: Update serviceService.js createService INSERT**

In `createService` function (around line 647), extend the INSERT to include new columns:

```javascript
// After existing field processing, add:
const travelRadiusKm = data.travelRadiusKm != null ? parseInt(data.travelRadiusKm) : null;
const minBookingHours = data.minBookingHours != null ? parseFloat(data.minBookingHours) : null;
const maxBookingHours = data.maxBookingHours != null ? parseFloat(data.maxBookingHours) : null;
const leadTimeDays = data.leadTimeDays != null ? parseInt(data.leadTimeDays) : 0;
const tags = data.tags ? JSON.stringify(data.tags) : null;
const inclusions = data.inclusions ? JSON.stringify(data.inclusions) : null;
const status = data.status === 'draft' ? 'draft' : 'active';

// Extend the INSERT statement columns and values to include:
// s_travel_radius_km, s_min_booking_hours, s_max_booking_hours,
// s_lead_time_days, s_tags, s_inclusions, s_status
// with values: travelRadiusKm, minBookingHours, maxBookingHours,
// leadTimeDays, tags, inclusions, status
```

**Step 3: Update serviceService.js updateService**

In `updateService` function (around line 754), add the new fields to the dynamic update builder:

```javascript
// Add these field mappings to the existing dynamic update logic:
if (data.travelRadiusKm !== undefined) {
  fields.push('s_travel_radius_km = ?');
  values.push(data.travelRadiusKm != null ? parseInt(data.travelRadiusKm) : null);
}
if (data.minBookingHours !== undefined) {
  fields.push('s_min_booking_hours = ?');
  values.push(data.minBookingHours != null ? parseFloat(data.minBookingHours) : null);
}
if (data.maxBookingHours !== undefined) {
  fields.push('s_max_booking_hours = ?');
  values.push(data.maxBookingHours != null ? parseFloat(data.maxBookingHours) : null);
}
if (data.leadTimeDays !== undefined) {
  fields.push('s_lead_time_days = ?');
  values.push(data.leadTimeDays != null ? parseInt(data.leadTimeDays) : 0);
}
if (data.tags !== undefined) {
  fields.push('s_tags = ?');
  values.push(data.tags ? JSON.stringify(data.tags) : null);
}
if (data.inclusions !== undefined) {
  fields.push('s_inclusions = ?');
  values.push(data.inclusions ? JSON.stringify(data.inclusions) : null);
}
if (data.status !== undefined) {
  fields.push('s_status = ?');
  values.push(data.status);
}
```

**Step 4: Update service GET to return new fields**

In `getServiceById` or wherever services are fetched, ensure the new columns are included in SELECT and returned in the response. Map DB column names to camelCase:

```javascript
// In the response mapping:
travelRadiusKm: row.s_travel_radius_km,
minBookingHours: row.s_min_booking_hours ? parseFloat(row.s_min_booking_hours) : null,
maxBookingHours: row.s_max_booking_hours ? parseFloat(row.s_max_booking_hours) : null,
leadTimeDays: row.s_lead_time_days || 0,
tags: row.s_tags ? JSON.parse(row.s_tags) : [],
inclusions: row.s_inclusions ? JSON.parse(row.s_inclusions) : [],
status: row.s_status || (row.s_is_active ? 'active' : 'inactive'),
```

**Step 5: Commit**

```bash
git add server/svc/serviceService.js server/controllers/serviceController.js
git commit -m "feat: backend accepts new service fields (travel radius, booking hours, lead time, tags, inclusions, status)"
```

---

### Task 3: Backend — Multi-Image Upload Endpoint

The `service_image` table already supports multiple images. Currently only one image is saved during create/update (embedded in the service request body as base64). We need a dedicated endpoint for uploading additional images.

**Files:**
- Modify: `server/routes/services.js`
- Modify: `server/controllers/serviceController.js`
- Modify: `server/svc/serviceService.js`

**Step 1: Add image management endpoints to routes**

In `server/routes/services.js`, add:

```javascript
// POST /api/services/:id/images — upload additional image
router.post('/services/:id/images',
  authMiddleware,
  requireRole('provider', 'admin'),
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
  ctrl.addServiceImage
);

// DELETE /api/services/:id/images/:imageId — remove an image
router.delete('/services/:id/images/:imageId',
  authMiddleware,
  requireRole('provider', 'admin'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    param('imageId').isInt({ min: 1 }).toInt(),
  ],
  validate,
  ctrl.deleteServiceImage
);

// PUT /api/services/:id/images/reorder — reorder images
router.put('/services/:id/images/reorder',
  authMiddleware,
  requireRole('provider', 'admin'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    body('order').isArray().withMessage('order must be an array of image IDs'),
  ],
  validate,
  ctrl.reorderServiceImages
);
```

**Step 2: Add controller methods**

In `server/controllers/serviceController.js`:

```javascript
async addServiceImage(req, res) {
  const { id } = req.params;
  const { image } = req.body; // base64
  if (!image || !image.startsWith('data:image')) {
    return res.status(400).json({ error: 'image must be a base64 data URI' });
  }
  const result = await serviceService.addImage(id, image);
  res.status(201).json(result);
}

async deleteServiceImage(req, res) {
  const { id, imageId } = req.params;
  await serviceService.deleteImage(id, imageId);
  res.json({ success: true });
}

async reorderServiceImages(req, res) {
  const { id } = req.params;
  const { order } = req.body; // array of image IDs in desired order
  await serviceService.reorderImages(id, order);
  res.json({ success: true });
}
```

**Step 3: Add service methods**

In `server/svc/serviceService.js`:

```javascript
async addImage(serviceId, base64Image) {
  // Get current max order
  const [rows] = await db.query(
    'SELECT MAX(si_order) as maxOrder FROM service_image WHERE si_service_id = ?',
    [serviceId]
  );
  const nextOrder = (rows[0]?.maxOrder ?? -1) + 1;

  // Check total count (max 10)
  const [countRows] = await db.query(
    'SELECT COUNT(*) as cnt FROM service_image WHERE si_service_id = ?',
    [serviceId]
  );
  if (countRows[0].cnt >= 10) {
    throw { status: 400, message: 'Maximum 10 images per service' };
  }

  const url = await saveBase64Image(base64Image, serviceId);
  const isPrimary = nextOrder === 0 ? 1 : 0;

  const [result] = await db.query(
    `INSERT INTO service_image (si_service_id, si_image_url, si_is_primary, si_order)
     VALUES (?, ?, ?, ?)`,
    [serviceId, url, isPrimary, nextOrder]
  );

  return { id: result.insertId, url, isPrimary, order: nextOrder };
}

async deleteImage(serviceId, imageId) {
  // Get image info
  const [rows] = await db.query(
    'SELECT si_image_url, si_is_primary FROM service_image WHERE idimage = ? AND si_service_id = ?',
    [imageId, serviceId]
  );
  if (rows.length === 0) throw { status: 404, message: 'Image not found' };

  // Delete file from disk
  const filePath = path.join(uploadsDir, rows[0].si_image_url.replace('/uploads/', ''));
  try { fs.unlinkSync(filePath); } catch (e) { /* file may not exist */ }

  // Delete DB record
  await db.query('DELETE FROM service_image WHERE idimage = ?', [imageId]);

  // If deleted image was primary, set next image as primary
  if (rows[0].si_is_primary) {
    await db.query(
      `UPDATE service_image SET si_is_primary = 1
       WHERE si_service_id = ? ORDER BY si_order ASC LIMIT 1`,
      [serviceId]
    );
  }
}

async reorderImages(serviceId, orderArray) {
  // orderArray = [imageId1, imageId2, ...] in desired order
  for (let i = 0; i < orderArray.length; i++) {
    await db.query(
      'UPDATE service_image SET si_order = ?, si_is_primary = ? WHERE idimage = ? AND si_service_id = ?',
      [i, i === 0 ? 1 : 0, orderArray[i], serviceId]
    );
  }
}
```

**Step 4: Commit**

```bash
git add server/routes/services.js server/controllers/serviceController.js server/svc/serviceService.js
git commit -m "feat: multi-image upload/delete/reorder endpoints for services"
```

---

### Task 4: Frontend — Update Form State for New Fields

**Files:**
- Modify: `mvc/hooks/useServiceForm.ts`

**Step 1: Extend ServiceFormState interface**

Add new fields to the form state type and initial state:

```typescript
// Add to the form state interface (or inline type):
images: Array<{ id?: number; uri: string; isPrimary: boolean }>; // multi-photo
travelRadiusKm: string;
minBookingHours: string;
maxBookingHours: string;
leadTimeDays: string;
tags: string[];
inclusions: string[];
status: 'draft' | 'active';
```

**Step 2: Update initial state in resetForm**

```typescript
// Add to the reset object:
images: [],
travelRadiusKm: '',
minBookingHours: '',
maxBookingHours: '',
leadTimeDays: '',
tags: [],
inclusions: [],
status: 'active',
```

**Step 3: Update handleAddService to send new fields**

In the request body construction (around line 546-571):

```typescript
// Add to the request body:
travelRadiusKm: newService.travelRadiusKm ? parseInt(newService.travelRadiusKm) : null,
minBookingHours: newService.minBookingHours ? parseFloat(newService.minBookingHours) : null,
maxBookingHours: newService.maxBookingHours ? parseFloat(newService.maxBookingHours) : null,
leadTimeDays: newService.leadTimeDays ? parseInt(newService.leadTimeDays) : 0,
tags: newService.tags.length > 0 ? newService.tags : null,
inclusions: newService.inclusions.length > 0 ? newService.inclusions : null,
status: newService.status,
```

**Step 4: Update handleImagePick for multi-photo**

Replace single image handling with multi-image array:

```typescript
const handleImagePick = async () => {
  // ... existing platform-specific picker code ...
  // Instead of setting newService.image, append to images array:
  setNewService((prev) => ({
    ...prev,
    images: [
      ...prev.images,
      { uri: base64DataUri, isPrimary: prev.images.length === 0 },
    ],
  }));
};

const handleRemoveImage = (index: number) => {
  setNewService((prev) => {
    const updated = prev.images.filter((_, i) => i !== index);
    // Ensure first remaining image is primary
    if (updated.length > 0 && !updated.some(img => img.isPrimary)) {
      updated[0].isPrimary = true;
    }
    return { ...prev, images: updated };
  });
};

const handleSetPrimaryImage = (index: number) => {
  setNewService((prev) => ({
    ...prev,
    images: prev.images.map((img, i) => ({ ...img, isPrimary: i === index })),
  }));
};
```

**Step 5: Update populateForEdit to load new fields**

```typescript
// In populateForEdit, add:
travelRadiusKm: service.travelRadiusKm?.toString() || '',
minBookingHours: service.minBookingHours?.toString() || '',
maxBookingHours: service.maxBookingHours?.toString() || '',
leadTimeDays: service.leadTimeDays?.toString() || '0',
tags: service.tags || [],
inclusions: service.inclusions || [],
status: service.status || 'active',
// Load existing images from API
images: (service.images || []).map((img: any) => ({
  id: img.id,
  uri: img.url.startsWith('http') ? img.url : `${API_BASE}${img.url}`,
  isPrimary: img.isPrimary,
})),
```

**Step 6: After service creation, upload additional images**

```typescript
// In handleAddService, after the main POST succeeds and we have the new service ID:
// Upload each additional image (first image is sent inline with the create request)
if (newService.images.length > 1) {
  for (let i = 1; i < newService.images.length; i++) {
    await apiClient.post(`/api/services/${newServiceId}/images`, {
      image: newService.images[i].uri,
    });
  }
}
```

**Step 7: Commit**

```bash
git add mvc/hooks/useServiceForm.ts
git commit -m "feat: form state supports multi-photo, travel radius, booking hours, lead time, tags, inclusions, draft status"
```

---

### Task 5: Frontend — Multi-Photo Gallery UI

**Files:**
- Modify: `mvc/components/services/ServiceFormTab.tsx`
- Modify: `mvc/views/provider/ServicesView.styles.ts`

**Step 1: Add photo gallery styles**

In `ServicesView.styles.ts`, add:

```typescript
photoGallery: {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 10,
  marginTop: 8,
},
photoThumb: {
  width: 100,
  height: 100,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  overflow: 'hidden' as const,
  position: 'relative' as const,
},
photoThumbImage: {
  width: '100%' as any,
  height: '100%' as any,
},
photoRemoveButton: {
  position: 'absolute' as const,
  top: 4,
  right: 4,
  backgroundColor: 'rgba(239, 68, 68, 0.9)',
  borderRadius: 10,
  width: 20,
  height: 20,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
},
photoPrimaryBadge: {
  position: 'absolute' as const,
  bottom: 4,
  left: 4,
  backgroundColor: 'rgba(37, 99, 235, 0.9)',
  borderRadius: 4,
  paddingHorizontal: 4,
  paddingVertical: 1,
},
photoPrimaryText: {
  color: '#FFFFFF',
  fontSize: 9,
  fontWeight: '600' as const,
},
photoAddButton: {
  width: 100,
  height: 100,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  borderStyle: 'dashed' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: '#F8FAFC',
},
photoCount: {
  fontSize: 12,
  color: '#94A3B8',
  marginTop: 4,
},
```

**Step 2: Replace single image picker with gallery in ServiceFormTab.tsx**

Replace the existing image section with:

```tsx
{/* Service Photos (up to 10) */}
<Text style={styles.inputLabel}>Service Photos</Text>
<Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
  First photo is the cover image. Tap to set as primary. Up to 10 photos.
</Text>
<View style={styles.photoGallery}>
  {newService.images.map((img, index) => (
    <TouchableOpacity
      key={index}
      style={styles.photoThumb}
      onPress={() => onSetPrimaryImage(index)}
      accessibilityRole="button"
      accessibilityLabel={`Photo ${index + 1}${img.isPrimary ? ', primary' : ''}`}
    >
      <Image source={{ uri: img.uri }} style={styles.photoThumbImage} />
      <TouchableOpacity
        style={styles.photoRemoveButton}
        onPress={() => onRemoveImage(index)}
        accessibilityRole="button"
        accessibilityLabel={`Remove photo ${index + 1}`}
      >
        <Feather name="x" size={12} color="#FFFFFF" />
      </TouchableOpacity>
      {img.isPrimary && (
        <View style={styles.photoPrimaryBadge}>
          <Text style={styles.photoPrimaryText}>Cover</Text>
        </View>
      )}
    </TouchableOpacity>
  ))}
  {newService.images.length < 10 && (
    <TouchableOpacity
      style={styles.photoAddButton}
      onPress={onImagePick}
      accessibilityRole="button"
      accessibilityLabel="Add photo"
    >
      <Feather name="plus" size={24} color="#94A3B8" />
      <Text style={styles.photoCount}>{newService.images.length}/10</Text>
    </TouchableOpacity>
  )}
</View>
```

**Step 3: Commit**

```bash
git add mvc/components/services/ServiceFormTab.tsx mvc/views/provider/ServicesView.styles.ts
git commit -m "feat: multi-photo gallery UI in service form (up to 10 images)"
```

---

### Task 6: Frontend — Tags & Inclusions UI

**Files:**
- Modify: `mvc/components/services/ServiceFormTab.tsx`
- Modify: `mvc/views/provider/ServicesView.styles.ts`

**Step 1: Add tag/chip styles**

```typescript
tagInputRow: {
  flexDirection: 'row' as const,
  gap: 8,
  marginBottom: 8,
},
tagInput: {
  flex: 1,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E2E8F0',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 8,
  fontSize: 14,
  color: '#0F172A',
},
tagAddButton: {
  backgroundColor: '#0F172A',
  borderRadius: 10,
  paddingHorizontal: 14,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
},
tagChipContainer: {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 6,
},
tagChip: {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: '#EFF6FF',
  borderRadius: 16,
  paddingHorizontal: 10,
  paddingVertical: 5,
  gap: 4,
},
tagChipText: {
  fontSize: 13,
  color: '#2563EB',
},
tagRemove: {
  width: 16,
  height: 16,
  borderRadius: 8,
  backgroundColor: '#BFDBFE',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
},
```

**Step 2: Create reusable TagInput component inline in ServiceFormTab**

```tsx
// Inside ServiceFormTab or as a local component:
const TagListInput: React.FC<{
  label: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  suggestions?: string[];
}> = ({ label, items, onAdd, onRemove, placeholder, suggestions }) => {
  const [inputValue, setInputValue] = React.useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue('');
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          style={styles.tagInput}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={placeholder}
          onSubmitEditing={handleAdd}
          accessibilityLabel={label}
        />
        <TouchableOpacity
          style={styles.tagAddButton}
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add ${label.toLowerCase()}`}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      {suggestions && suggestions.length > 0 && items.length === 0 && (
        <View style={[styles.tagChipContainer, { marginBottom: 6 }]}>
          {suggestions.map((s) => (
            <TouchableOpacity key={s} onPress={() => onAdd(s)}>
              <View style={[styles.tagChip, { backgroundColor: '#F1F5F9' }]}>
                <Text style={[styles.tagChipText, { color: '#64748B' }]}>+ {s}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.tagChipContainer}>
        {items.map((item, index) => (
          <View key={item} style={styles.tagChip}>
            <Text style={styles.tagChipText}>{item}</Text>
            <TouchableOpacity
              style={styles.tagRemove}
              onPress={() => onRemove(index)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item}`}
            >
              <Feather name="x" size={10} color="#2563EB" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};
```

**Step 3: Add Tags section to the form**

```tsx
<TagListInput
  label="Tags & Amenities"
  items={newService.tags}
  onAdd={(tag) => onServiceChange((prev) => ({ ...prev, tags: [...prev.tags, tag] }))}
  onRemove={(i) => onServiceChange((prev) => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))}
  placeholder="e.g. outdoor, parking, wheelchair accessible"
  suggestions={['Indoor', 'Outdoor', 'Parking', 'WiFi', 'Pet Friendly', 'Wheelchair Accessible']}
/>
```

**Step 4: Add Inclusions section to the form**

```tsx
<TagListInput
  label="What's Included"
  items={newService.inclusions}
  onAdd={(item) => onServiceChange((prev) => ({ ...prev, inclusions: [...prev.inclusions, item] }))}
  onRemove={(i) => onServiceChange((prev) => ({ ...prev, inclusions: prev.inclusions.filter((_, idx) => idx !== i) }))}
  placeholder="e.g. setup, sound system, 100 edited photos"
/>
```

**Step 5: Commit**

```bash
git add mvc/components/services/ServiceFormTab.tsx mvc/views/provider/ServicesView.styles.ts
git commit -m "feat: tags/amenities and inclusions chip input UI in service form"
```

---

### Task 7: Frontend — Booking Constraints & Service Area Fields

**Files:**
- Modify: `mvc/components/services/ServiceFormTab.tsx`

**Step 1: Add Travel Radius field (after Location section)**

Only show for non-venue categories (photographers, DJs travel; venues don't):

```tsx
{newService.category !== 'venue' && (
  <View style={{ marginBottom: 16 }}>
    <Text style={styles.inputLabel}>Service Area (Travel Radius)</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TextInput
        style={[styles.input, { flex: 1 }]}
        value={newService.travelRadiusKm}
        onChangeText={(v) => onFieldChange('travelRadiusKm', v.replace(/[^0-9]/g, ''))}
        placeholder="e.g. 50"
        keyboardType="numeric"
        accessibilityLabel="Travel radius in kilometers"
      />
      <Text style={{ fontSize: 14, color: '#64748B' }}>km from base location</Text>
    </View>
  </View>
)}
```

**Step 2: Add Booking Duration constraints (after price fields)**

```tsx
<View style={{ marginBottom: 16 }}>
  <Text style={styles.inputLabel}>Booking Duration Limits</Text>
  <View style={{ flexDirection: 'row', gap: 12 }}>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Minimum (hours)</Text>
      <TextInput
        style={styles.input}
        value={newService.minBookingHours}
        onChangeText={(v) => onFieldChange('minBookingHours', v.replace(/[^0-9.]/g, ''))}
        placeholder="e.g. 2"
        keyboardType="numeric"
        accessibilityLabel="Minimum booking hours"
      />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Maximum (hours)</Text>
      <TextInput
        style={styles.input}
        value={newService.maxBookingHours}
        onChangeText={(v) => onFieldChange('maxBookingHours', v.replace(/[^0-9.]/g, ''))}
        placeholder="e.g. 12"
        keyboardType="numeric"
        accessibilityLabel="Maximum booking hours"
      />
    </View>
  </View>
</View>
```

**Step 3: Add Lead Time field**

```tsx
<View style={{ marginBottom: 16 }}>
  <Text style={styles.inputLabel}>Advance Booking Required</Text>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <TextInput
      style={[styles.input, { width: 80 }]}
      value={newService.leadTimeDays}
      onChangeText={(v) => onFieldChange('leadTimeDays', v.replace(/[^0-9]/g, ''))}
      placeholder="0"
      keyboardType="numeric"
      accessibilityLabel="Minimum days in advance for booking"
    />
    <Text style={{ fontSize: 14, color: '#64748B' }}>days before event date</Text>
  </View>
  <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
    Customers must book at least this many days in advance. Set to 0 for no restriction.
  </Text>
</View>
```

**Step 4: Commit**

```bash
git add mvc/components/services/ServiceFormTab.tsx
git commit -m "feat: travel radius, booking duration limits, and lead time fields in service form"
```

---

### Task 8: Frontend — Save as Draft Button

**Files:**
- Modify: `mvc/components/services/ServiceFormTab.tsx`
- Modify: `mvc/hooks/useServiceForm.ts`

**Step 1: Add draft save handler in useServiceForm**

```typescript
const handleSaveAsDraft = (onSuccess?: () => void) => {
  // Same as handleAddService but with status: 'draft' and relaxed validation
  // Only require: name, category
  if (!newService.name.trim()) {
    setErrorMessage('Service name is required even for drafts');
    return;
  }
  if (!newService.category) {
    setErrorMessage('Please select a category');
    return;
  }

  const body = {
    // ... same body construction as handleAddService ...
    status: 'draft',
  };

  createMutation.mutate(body, {
    onSuccess: () => {
      setSuccessMessage('Draft saved! You can finish editing later.');
      resetForm();
      onSuccess?.();
    },
    onError: (err) => setErrorMessage(err.message || 'Failed to save draft'),
  });
};
```

**Step 2: Add "Save as Draft" button next to "Add Service" button**

```tsx
<View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
  {activeTab === 'add' && (
    <TouchableOpacity
      style={[styles.submitButton, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', flex: 1 }]}
      onPress={() => onSaveAsDraft?.()}
      disabled={submitting}
      accessibilityRole="button"
      accessibilityLabel="Save as draft"
    >
      <Feather name="save" size={16} color="#64748B" />
      <Text style={[styles.submitButtonText, { color: '#64748B' }]}>Save Draft</Text>
    </TouchableOpacity>
  )}
  <TouchableOpacity
    style={[styles.submitButton, { flex: 1 }]}
    onPress={onSubmit}
    disabled={submitting}
    accessibilityRole="button"
    accessibilityLabel={activeTab === 'edit' ? 'Update service' : 'Add service'}
  >
    <Text style={styles.submitButtonText}>
      {submitting ? 'Saving...' : activeTab === 'edit' ? 'Update Service' : 'Publish Service'}
    </Text>
  </TouchableOpacity>
</View>
```

**Step 3: Show draft badge in service list**

In `ServiceListTab.tsx`, update the status badge rendering:

```tsx
// Update status badge to handle 'draft':
<View style={[
  styles.statusBadge,
  service.status === 'active' ? styles.statusActive :
  service.status === 'draft' ? { backgroundColor: '#FEF3C7' } :
  styles.statusInactive,
]}>
  <Text style={[
    styles.statusText,
    service.status === 'draft' && { color: '#D97706' },
  ]}>
    {service.status || (service.status === 'active' ? 'active' : 'inactive')}
  </Text>
</View>
```

**Step 4: Commit**

```bash
git add mvc/components/services/ServiceFormTab.tsx mvc/hooks/useServiceForm.ts mvc/components/services/ServiceListTab.tsx
git commit -m "feat: save-as-draft button with relaxed validation, draft status badge in service list"
```

---

### Task 9: Frontend — Collapsible Form Sections

The form now has many fields. Organize them into collapsible sections so it's not overwhelming.

**Files:**
- Modify: `mvc/components/services/ServiceFormTab.tsx`
- Modify: `mvc/views/provider/ServicesView.styles.ts`

**Step 1: Add section styles**

```typescript
formSection: {
  borderWidth: 1,
  borderColor: '#E2E8F0',
  borderRadius: 12,
  marginBottom: 12,
  overflow: 'hidden' as const,
},
formSectionHeader: {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  padding: 14,
  backgroundColor: '#F8FAFC',
},
formSectionTitle: {
  fontSize: 14,
  fontWeight: '600' as const,
  color: '#0F172A',
},
formSectionRequired: {
  fontSize: 11,
  color: '#94A3B8',
  fontWeight: '400' as const,
},
formSectionBody: {
  padding: 14,
  paddingTop: 0,
},
```

**Step 2: Create CollapsibleSection component**

```tsx
const CollapsibleSection: React.FC<{
  title: string;
  required?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, required, defaultOpen = false, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <View style={styles.formSection}>
      <TouchableOpacity
        style={styles.formSectionHeader}
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel={`${title} section, ${open ? 'collapse' : 'expand'}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.formSectionTitle}>{title}</Text>
          {required && <Text style={styles.formSectionRequired}>Required</Text>}
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
      </TouchableOpacity>
      {open && <View style={styles.formSectionBody}>{children}</View>}
    </View>
  );
};
```

**Step 3: Organize form fields into sections**

```
Section 1: "Basic Information" (defaultOpen: true, required)
  - Service Name, Category, Description

Section 2: "Photos" (defaultOpen: true)
  - Multi-photo gallery

Section 3: "Location" (defaultOpen: true, required)
  - Map picker, Travel radius

Section 4: "Pricing" (defaultOpen: true, required)
  - Price fields (hourly/daily/per-person)

Section 5: "Booking Rules" (defaultOpen: false)
  - Min/Max duration, Lead time

Section 6: "Details" (defaultOpen: false)
  - Max Capacity, Tags, Inclusions

Section 7: "Cancellation Policy" (defaultOpen: false)
  - Policy selector
```

**Step 4: Commit**

```bash
git add mvc/components/services/ServiceFormTab.tsx mvc/views/provider/ServicesView.styles.ts
git commit -m "feat: collapsible form sections for organized service creation UI"
```

---

### Task 10: Frontend — Availability Schedule Integration (Post-Create)

The availability API already exists. After creating a service, show an inline prompt to set the weekly schedule. This hooks into the existing `PUT /api/provider/availability/schedule` endpoint.

**Files:**
- Create: `mvc/components/services/AvailabilityScheduleEditor.tsx`
- Modify: `mvc/views/provider/ServicesView.styles.ts`

**Step 1: Create AvailabilityScheduleEditor component**

```tsx
// mvc/components/services/AvailabilityScheduleEditor.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../../services/apiClient';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_START = '09:00';
const DEFAULT_END = '18:00';

interface DaySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface Props {
  serviceId: number;
  onComplete: () => void;
  styles: any; // pass parent styles
}

export const AvailabilityScheduleEditor: React.FC<Props> = ({ serviceId, onComplete, styles }) => {
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS.map((_, i) => ({
      dayOfWeek: i,
      startTime: DEFAULT_START,
      endTime: i === 0 ? '16:00' : DEFAULT_END, // shorter Sunday
      isAvailable: i !== 0, // closed Sunday by default
    }))
  );
  const [saving, setSaving] = useState(false);

  // Load existing schedule if editing
  useEffect(() => {
    apiClient.get(`/api/provider/availability/schedule?serviceId=${serviceId}`)
      .then((data) => {
        if (data.schedule && data.schedule.length > 0) {
          setSchedule(data.schedule);
        }
      })
      .catch(() => { /* use defaults */ });
  }, [serviceId]);

  const toggleDay = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((d) => d.dayOfWeek === dayIndex ? { ...d, isAvailable: !d.isAvailable } : d)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/api/provider/availability/schedule', {
        serviceId,
        schedule: schedule.filter((d) => d.isAvailable),
      });
      onComplete();
    } catch (err) {
      // show error
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 12 }}>
        Set Availability Schedule
      </Text>
      <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
        Toggle which days you're available and set your working hours.
      </Text>
      {DAYS.map((day, i) => (
        <View
          key={day}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Switch
              value={schedule[i].isAvailable}
              onValueChange={() => toggleDay(i)}
              trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
              thumbColor={schedule[i].isAvailable ? '#2563EB' : '#94A3B8'}
            />
            <Text style={{
              fontSize: 14, color: schedule[i].isAvailable ? '#0F172A' : '#94A3B8',
              fontWeight: schedule[i].isAvailable ? '500' : '400', width: 90,
            }}>
              {day}
            </Text>
          </View>
          {schedule[i].isAvailable && (
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              {schedule[i].startTime} - {schedule[i].endTime}
            </Text>
          )}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
                   borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
          onPress={onComplete}
          accessibilityRole="button"
          accessibilityLabel="Skip availability setup"
        >
          <Text style={{ color: '#64748B', fontWeight: '500' }}>Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 10, paddingVertical: 12,
                   alignItems: 'center' }}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save availability schedule"
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
            {saving ? 'Saving...' : 'Save Schedule'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

**Step 2: Show availability editor after service creation success**

In `ServicesView.tsx`, after a successful service creation, instead of immediately going back to the list, show the availability editor:

```tsx
// Add state:
const [newlyCreatedServiceId, setNewlyCreatedServiceId] = useState<number | null>(null);

// In onFormSubmit success callback:
// Instead of going directly to list, set the service ID to trigger availability editor
setNewlyCreatedServiceId(newServiceId);

// In the render, show availability editor when newlyCreatedServiceId is set:
{newlyCreatedServiceId && (
  <AvailabilityScheduleEditor
    serviceId={newlyCreatedServiceId}
    onComplete={() => {
      setNewlyCreatedServiceId(null);
      setActiveTab('list');
      loadServices();
    }}
    styles={styles}
  />
)}
```

**Step 3: Commit**

```bash
git add mvc/components/services/AvailabilityScheduleEditor.tsx mvc/views/provider/ServicesView.tsx
git commit -m "feat: availability schedule editor shown after service creation"
```

---

### Task 11: Update useServicesList to Return New Fields

**Files:**
- Modify: `mvc/hooks/useServicesList.ts`

**Step 1: Extend ProviderService type**

```typescript
// Add to ProviderService interface:
travelRadiusKm?: number | null;
minBookingHours?: number | null;
maxBookingHours?: number | null;
leadTimeDays?: number;
tags?: string[];
inclusions?: string[];
status?: 'draft' | 'active' | 'inactive';
images?: Array<{ id: number; url: string; isPrimary: boolean }>;
```

**Step 2: Update the DB-to-frontend mapping**

In the service mapping function, add:

```typescript
travelRadiusKm: raw.s_travel_radius_km ?? raw.travelRadiusKm ?? null,
minBookingHours: raw.s_min_booking_hours ?? raw.minBookingHours ?? null,
maxBookingHours: raw.s_max_booking_hours ?? raw.maxBookingHours ?? null,
leadTimeDays: raw.s_lead_time_days ?? raw.leadTimeDays ?? 0,
tags: (raw.s_tags || raw.tags) ? JSON.parse(typeof (raw.s_tags || raw.tags) === 'string' ? (raw.s_tags || raw.tags) : '[]') : [],
inclusions: (raw.s_inclusions || raw.inclusions) ? JSON.parse(typeof (raw.s_inclusions || raw.inclusions) === 'string' ? (raw.s_inclusions || raw.inclusions) : '[]') : [],
status: raw.s_status || raw.status || (raw.s_is_active ? 'active' : 'inactive'),
```

**Step 3: Commit**

```bash
git add mvc/hooks/useServicesList.ts
git commit -m "feat: useServicesList returns new service fields (travel radius, tags, inclusions, etc.)"
```

---

## Execution Order

```
Task 1  (DB migration)         — foundation, no dependencies
Task 2  (Backend create/update) — depends on Task 1
Task 3  (Backend multi-image)   — depends on Task 1
    |
Task 4  (Frontend form state)   — depends on Tasks 2-3
    |
Task 5  (Multi-photo UI)        — depends on Task 4
Task 6  (Tags & inclusions UI)  — depends on Task 4
Task 7  (Booking constraints)   — depends on Task 4
Task 8  (Save as draft)         — depends on Task 4
    |
Task 9  (Collapsible sections)  — depends on Tasks 5-8
Task 10 (Availability editor)   — depends on Task 4
Task 11 (List returns fields)   — depends on Task 2
```

Tasks 5, 6, 7, 8 can be done in parallel after Task 4.
Tasks 2 and 3 can be done in parallel after Task 1.

## Verification After Each Task

1. `npx tsc --noEmit` — 0 TypeScript errors
2. Server starts without errors: `cd server && node index.js`
3. Service creation form renders correctly at 375px and 1440px
4. Existing E2E tests still pass for provider services flow
