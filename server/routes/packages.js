// server/routes/packages.js
// Package endpoints: CRUD for packages, categories, items, booking packages, price calculation
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');

// Helper function to calculate package price from items
function calculatePackagePrice(pkg, paxCount = null, removedItemIds = []) {
    if (pkg.sp_price_type === 'fixed') {
        return parseFloat(pkg.sp_base_price) || 0;
    }
    if (pkg.sp_price_type === 'per_person' && paxCount) {
        return (parseFloat(pkg.sp_base_price) || 0) * paxCount;
    }

    // Calculate from items
    let total = 0;
    for (const cat of pkg.categories || []) {
        for (const item of cat.items || []) {
            // Skip removed items
            if (item.iditem && removedItemIds.includes(item.iditem)) {
                continue;
            }
            total += (item.pi_quantity || 1) * (parseFloat(item.pi_unit_price) || 0);
        }
    }

    // Apply discount
    const discount = parseFloat(pkg.sp_discount_percent) || 0;
    return total * (1 - discount / 100);
}

// Get all packages for a service
router.get('/services/:serviceId/packages', async (req, res) => {
    const serviceId = Number(req.params.serviceId);
    if (!Number.isFinite(serviceId)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }

    try {
        const pool = getPool();

        // Get packages
        const [packages] = await pool.query(`
            SELECT * FROM service_package
            WHERE sp_service_id = ?
            ORDER BY sp_display_order ASC, sp_created_at DESC
        `, [serviceId]);

        // For each package, get categories and items
        for (const pkg of packages) {
            const [categories] = await pool.query(`
                SELECT * FROM package_category
                WHERE pc_package_id = ?
                ORDER BY pc_display_order ASC
            `, [pkg.idpackage]);

            for (const cat of categories) {
                const [items] = await pool.query(`
                    SELECT * FROM package_item
                    WHERE pi_category_id = ?
                    ORDER BY pi_display_order ASC
                `, [cat.idcategory]);
                cat.items = items;
            }
            pkg.categories = categories;

            // Calculate price if type is 'calculated'
            if (pkg.sp_price_type === 'calculated') {
                pkg.calculated_price = calculatePackagePrice(pkg);
            }
        }

        return res.json({ ok: true, packages });
    } catch (err) {
        console.error('Get service packages failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get single package with full details
router.get('/packages/:id', async (req, res) => {
    const packageId = Number(req.params.id);
    if (!Number.isFinite(packageId)) {
        return res.status(400).json({ ok: false, error: 'Invalid package ID' });
    }

    try {
        const pool = getPool();

        const [packages] = await pool.query(`
            SELECT sp.*, s.s_name as service_name
            FROM service_package sp
            LEFT JOIN service s ON sp.sp_service_id = s.idservice
            WHERE sp.idpackage = ?
        `, [packageId]);

        if (packages.length === 0) {
            return res.status(404).json({ ok: false, error: 'Package not found' });
        }

        const pkg = packages[0];

        // Get categories
        const [categories] = await pool.query(`
            SELECT * FROM package_category
            WHERE pc_package_id = ?
            ORDER BY pc_display_order ASC
        `, [packageId]);

        for (const cat of categories) {
            const [items] = await pool.query(`
                SELECT * FROM package_item
                WHERE pi_category_id = ?
                ORDER BY pi_display_order ASC
            `, [cat.idcategory]);
            cat.items = items;
        }
        pkg.categories = categories;

        // Calculate price if type is 'calculated'
        if (pkg.sp_price_type === 'calculated') {
            pkg.calculated_price = calculatePackagePrice(pkg);
        }

        return res.json({ ok: true, package: pkg });
    } catch (err) {
        console.error('Get package failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Create package with categories and items
router.post('/services/:serviceId/packages', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const serviceId = Number(req.params.serviceId);
    if (!Number.isFinite(serviceId)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }

    const {
        name, description, minPax, maxPax, basePrice,
        priceType, discountPercent, isActive, displayOrder, categories
    } = req.body || {};

    if (!name || !name.trim()) {
        return res.status(400).json({ ok: false, error: 'Package name is required' });
    }

    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();

        // Insert package
        const [pkgResult] = await connection.query(`
            INSERT INTO service_package
            (sp_service_id, sp_name, sp_description, sp_min_pax, sp_max_pax,
             sp_base_price, sp_price_type, sp_discount_percent, sp_is_active, sp_display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            serviceId,
            name.trim(),
            description || null,
            minPax || 1,
            maxPax || null,
            basePrice || null,
            priceType || 'calculated',
            discountPercent || 0,
            isActive !== false ? 1 : 0,
            displayOrder || 0
        ]);

        const packageId = pkgResult.insertId;

        // Insert categories and items
        if (categories && Array.isArray(categories)) {
            for (let catIdx = 0; catIdx < categories.length; catIdx++) {
                const cat = categories[catIdx];
                if (!cat.name || !cat.name.trim()) continue;

                const [catResult] = await connection.query(`
                    INSERT INTO package_category
                    (pc_package_id, pc_name, pc_description, pc_display_order)
                    VALUES (?, ?, ?, ?)
                `, [
                    packageId,
                    cat.name.trim(),
                    cat.description || null,
                    cat.displayOrder !== undefined ? cat.displayOrder : catIdx
                ]);

                const categoryId = catResult.insertId;

                // Insert items
                if (cat.items && Array.isArray(cat.items)) {
                    for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
                        const item = cat.items[itemIdx];
                        if (!item.name || !item.name.trim()) continue;

                        await connection.query(`
                            INSERT INTO package_item
                            (pi_category_id, pi_name, pi_description, pi_quantity,
                             pi_unit, pi_unit_price, pi_is_optional, pi_display_order)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            categoryId,
                            item.name.trim(),
                            item.description || null,
                            item.quantity || 1,
                            item.unit || 'pc',
                            item.unitPrice || 0,
                            item.isOptional ? 1 : 0,
                            item.displayOrder !== undefined ? item.displayOrder : itemIdx
                        ]);
                    }
                }
            }
        }

        await connection.commit();
        return res.json({ ok: true, id: packageId, message: 'Package created successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Create package failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: err.message || 'Database error' });
    } finally {
        connection.release();
    }
});

// Update package
router.put('/packages/:id', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const packageId = Number(req.params.id);
    if (!Number.isFinite(packageId)) {
        return res.status(400).json({ ok: false, error: 'Invalid package ID' });
    }

    const {
        name, description, minPax, maxPax, basePrice,
        priceType, discountPercent, isActive, displayOrder, categories
    } = req.body || {};

    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();

        // Check if package exists
        const [existing] = await connection.query(
            'SELECT idpackage FROM service_package WHERE idpackage = ?',
            [packageId]
        );
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ ok: false, error: 'Package not found' });
        }

        // Update package
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('sp_name = ?');
            updateValues.push(name.trim());
        }
        if (description !== undefined) {
            updateFields.push('sp_description = ?');
            updateValues.push(description || null);
        }
        if (minPax !== undefined) {
            updateFields.push('sp_min_pax = ?');
            updateValues.push(minPax || 1);
        }
        if (maxPax !== undefined) {
            updateFields.push('sp_max_pax = ?');
            updateValues.push(maxPax || null);
        }
        if (basePrice !== undefined) {
            updateFields.push('sp_base_price = ?');
            updateValues.push(basePrice || null);
        }
        if (priceType !== undefined) {
            updateFields.push('sp_price_type = ?');
            updateValues.push(priceType);
        }
        if (discountPercent !== undefined) {
            updateFields.push('sp_discount_percent = ?');
            updateValues.push(discountPercent || 0);
        }
        if (isActive !== undefined) {
            updateFields.push('sp_is_active = ?');
            updateValues.push(isActive ? 1 : 0);
        }
        if (displayOrder !== undefined) {
            updateFields.push('sp_display_order = ?');
            updateValues.push(displayOrder || 0);
        }

        if (updateFields.length > 0) {
            updateValues.push(packageId);
            await connection.query(
                `UPDATE service_package SET ${updateFields.join(', ')} WHERE idpackage = ?`,
                updateValues
            );
        }

        // If categories provided, replace all categories and items
        if (categories !== undefined && Array.isArray(categories)) {
            // Delete existing categories (items will cascade)
            await connection.query('DELETE FROM package_category WHERE pc_package_id = ?', [packageId]);

            // Insert new categories and items
            for (let catIdx = 0; catIdx < categories.length; catIdx++) {
                const cat = categories[catIdx];
                if (!cat.name || !cat.name.trim()) continue;

                const [catResult] = await connection.query(`
                    INSERT INTO package_category
                    (pc_package_id, pc_name, pc_description, pc_display_order)
                    VALUES (?, ?, ?, ?)
                `, [
                    packageId,
                    cat.name.trim(),
                    cat.description || null,
                    cat.displayOrder !== undefined ? cat.displayOrder : catIdx
                ]);

                const categoryId = catResult.insertId;

                if (cat.items && Array.isArray(cat.items)) {
                    for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
                        const item = cat.items[itemIdx];
                        if (!item.name || !item.name.trim()) continue;

                        await connection.query(`
                            INSERT INTO package_item
                            (pi_category_id, pi_name, pi_description, pi_quantity,
                             pi_unit, pi_unit_price, pi_is_optional, pi_display_order)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            categoryId,
                            item.name.trim(),
                            item.description || null,
                            item.quantity || 1,
                            item.unit || 'pc',
                            item.unitPrice || 0,
                            item.isOptional ? 1 : 0,
                            item.displayOrder !== undefined ? item.displayOrder : itemIdx
                        ]);
                    }
                }
            }
        }

        await connection.commit();
        return res.json({ ok: true, message: 'Package updated successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Update package failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: err.message || 'Database error' });
    } finally {
        connection.release();
    }
});

// Delete package
router.delete('/packages/:id', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const packageId = Number(req.params.id);
    if (!Number.isFinite(packageId)) {
        return res.status(400).json({ ok: false, error: 'Invalid package ID' });
    }

    try {
        const pool = getPool();
        const [result] = await pool.query('DELETE FROM service_package WHERE idpackage = ?', [packageId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ ok: false, error: 'Package not found' });
        }

        return res.json({ ok: true, message: 'Package deleted successfully' });
    } catch (err) {
        console.error('Delete package failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Add category to package
router.post('/packages/:id/categories', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const packageId = Number(req.params.id);
    if (!Number.isFinite(packageId)) {
        return res.status(400).json({ ok: false, error: 'Invalid package ID' });
    }

    const { name, description, displayOrder } = req.body || {};
    if (!name || !name.trim()) {
        return res.status(400).json({ ok: false, error: 'Category name is required' });
    }

    try {
        const pool = getPool();

        // Check package exists
        const [pkgExists] = await pool.query(
            'SELECT idpackage FROM service_package WHERE idpackage = ?',
            [packageId]
        );
        if (pkgExists.length === 0) {
            return res.status(404).json({ ok: false, error: 'Package not found' });
        }

        const [result] = await pool.query(`
            INSERT INTO package_category
            (pc_package_id, pc_name, pc_description, pc_display_order)
            VALUES (?, ?, ?, ?)
        `, [packageId, name.trim(), description || null, displayOrder || 0]);

        return res.json({ ok: true, id: result.insertId, message: 'Category added successfully' });
    } catch (err) {
        console.error('Add category failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Update category
router.put('/categories/:id', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const categoryId = Number(req.params.id);
    if (!Number.isFinite(categoryId)) {
        return res.status(400).json({ ok: false, error: 'Invalid category ID' });
    }

    const { name, description, displayOrder } = req.body || {};

    try {
        const pool = getPool();

        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('pc_name = ?');
            updateValues.push(name.trim());
        }
        if (description !== undefined) {
            updateFields.push('pc_description = ?');
            updateValues.push(description || null);
        }
        if (displayOrder !== undefined) {
            updateFields.push('pc_display_order = ?');
            updateValues.push(displayOrder);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ ok: false, error: 'No fields to update' });
        }

        updateValues.push(categoryId);
        const [result] = await pool.query(
            `UPDATE package_category SET ${updateFields.join(', ')} WHERE idcategory = ?`,
            updateValues
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ ok: false, error: 'Category not found' });
        }

        return res.json({ ok: true, message: 'Category updated successfully' });
    } catch (err) {
        console.error('Update category failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Delete category
router.delete('/categories/:id', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const categoryId = Number(req.params.id);
    if (!Number.isFinite(categoryId)) {
        return res.status(400).json({ ok: false, error: 'Invalid category ID' });
    }

    try {
        const pool = getPool();
        const [result] = await pool.query('DELETE FROM package_category WHERE idcategory = ?', [categoryId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ ok: false, error: 'Category not found' });
        }

        return res.json({ ok: true, message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Delete category failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Add item to category
router.post('/categories/:id/items', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const categoryId = Number(req.params.id);
    if (!Number.isFinite(categoryId)) {
        return res.status(400).json({ ok: false, error: 'Invalid category ID' });
    }

    const { name, description, quantity, unit, unitPrice, isOptional, displayOrder } = req.body || {};
    if (!name || !name.trim()) {
        return res.status(400).json({ ok: false, error: 'Item name is required' });
    }

    try {
        const pool = getPool();

        // Check category exists
        const [catExists] = await pool.query(
            'SELECT idcategory FROM package_category WHERE idcategory = ?',
            [categoryId]
        );
        if (catExists.length === 0) {
            return res.status(404).json({ ok: false, error: 'Category not found' });
        }

        const [result] = await pool.query(`
            INSERT INTO package_item
            (pi_category_id, pi_name, pi_description, pi_quantity,
             pi_unit, pi_unit_price, pi_is_optional, pi_display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            categoryId,
            name.trim(),
            description || null,
            quantity || 1,
            unit || 'pc',
            unitPrice || 0,
            isOptional ? 1 : 0,
            displayOrder || 0
        ]);

        return res.json({ ok: true, id: result.insertId, message: 'Item added successfully' });
    } catch (err) {
        console.error('Add item failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Bulk add/update items to category
router.post('/categories/:id/items/bulk', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const categoryId = Number(req.params.id);
    if (!Number.isFinite(categoryId)) {
        return res.status(400).json({ ok: false, error: 'Invalid category ID' });
    }

    const { items, replaceAll } = req.body || {};
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ ok: false, error: 'Items array is required' });
    }

    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();

        // Check category exists
        const [catExists] = await connection.query(
            'SELECT idcategory FROM package_category WHERE idcategory = ?',
            [categoryId]
        );
        if (catExists.length === 0) {
            await connection.rollback();
            return res.status(404).json({ ok: false, error: 'Category not found' });
        }

        // If replaceAll, delete existing items
        if (replaceAll) {
            await connection.query('DELETE FROM package_item WHERE pi_category_id = ?', [categoryId]);
        }

        const insertedIds = [];
        for (let idx = 0; idx < items.length; idx++) {
            const item = items[idx];
            if (!item.name || !item.name.trim()) continue;

            const [result] = await connection.query(`
                INSERT INTO package_item
                (pi_category_id, pi_name, pi_description, pi_quantity,
                 pi_unit, pi_unit_price, pi_is_optional, pi_display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                categoryId,
                item.name.trim(),
                item.description || null,
                item.quantity || 1,
                item.unit || 'pc',
                item.unitPrice || 0,
                item.isOptional ? 1 : 0,
                item.displayOrder !== undefined ? item.displayOrder : idx
            ]);
            insertedIds.push(result.insertId);
        }

        await connection.commit();
        return res.json({ ok: true, ids: insertedIds, message: 'Items added successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Bulk add items failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    } finally {
        connection.release();
    }
});

// Update item
router.put('/items/:id', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId)) {
        return res.status(400).json({ ok: false, error: 'Invalid item ID' });
    }

    const { name, description, quantity, unit, unitPrice, isOptional, displayOrder } = req.body || {};

    try {
        const pool = getPool();

        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('pi_name = ?');
            updateValues.push(name.trim());
        }
        if (description !== undefined) {
            updateFields.push('pi_description = ?');
            updateValues.push(description || null);
        }
        if (quantity !== undefined) {
            updateFields.push('pi_quantity = ?');
            updateValues.push(quantity || 1);
        }
        if (unit !== undefined) {
            updateFields.push('pi_unit = ?');
            updateValues.push(unit || 'pc');
        }
        if (unitPrice !== undefined) {
            updateFields.push('pi_unit_price = ?');
            updateValues.push(unitPrice || 0);
        }
        if (isOptional !== undefined) {
            updateFields.push('pi_is_optional = ?');
            updateValues.push(isOptional ? 1 : 0);
        }
        if (displayOrder !== undefined) {
            updateFields.push('pi_display_order = ?');
            updateValues.push(displayOrder);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ ok: false, error: 'No fields to update' });
        }

        updateValues.push(itemId);
        const [result] = await pool.query(
            `UPDATE package_item SET ${updateFields.join(', ')} WHERE iditem = ?`,
            updateValues
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ ok: false, error: 'Item not found' });
        }

        return res.json({ ok: true, message: 'Item updated successfully' });
    } catch (err) {
        console.error('Update item failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Delete item
router.delete('/items/:id', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId)) {
        return res.status(400).json({ ok: false, error: 'Invalid item ID' });
    }

    try {
        const pool = getPool();
        const [result] = await pool.query('DELETE FROM package_item WHERE iditem = ?', [itemId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ ok: false, error: 'Item not found' });
        }

        return res.json({ ok: true, message: 'Item deleted successfully' });
    } catch (err) {
        console.error('Delete item failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Calculate package price
router.get('/packages/:id/calculate-price', async (req, res) => {
    const packageId = Number(req.params.id);
    if (!Number.isFinite(packageId)) {
        return res.status(400).json({ ok: false, error: 'Invalid package ID' });
    }

    const pax = req.query.pax ? Number(req.query.pax) : null;
    const removedItems = req.query.removedItems ?
        req.query.removedItems.split(',').map(Number).filter(n => Number.isFinite(n)) : [];

    try {
        const pool = getPool();

        // Get package
        const [packages] = await pool.query(
            'SELECT * FROM service_package WHERE idpackage = ?',
            [packageId]
        );

        if (packages.length === 0) {
            return res.status(404).json({ ok: false, error: 'Package not found' });
        }

        const pkg = packages[0];

        // Get categories and items
        const [categories] = await pool.query(`
            SELECT * FROM package_category
            WHERE pc_package_id = ?
            ORDER BY pc_display_order ASC
        `, [packageId]);

        for (const cat of categories) {
            const [items] = await pool.query(`
                SELECT * FROM package_item
                WHERE pi_category_id = ?
                ORDER BY pi_display_order ASC
            `, [cat.idcategory]);
            cat.items = items;
        }
        pkg.categories = categories;

        const calculatedPrice = calculatePackagePrice(pkg, pax, removedItems);

        // Also calculate breakdown
        const breakdown = {
            categories: [],
            subtotal: 0,
            discount: parseFloat(pkg.sp_discount_percent) || 0,
            total: calculatedPrice
        };

        for (const cat of categories) {
            let catTotal = 0;
            const catItems = [];
            for (const item of cat.items) {
                if (removedItems.includes(item.iditem)) continue;
                const itemTotal = (item.pi_quantity || 1) * (parseFloat(item.pi_unit_price) || 0);
                catTotal += itemTotal;
                catItems.push({
                    id: item.iditem,
                    name: item.pi_name,
                    quantity: item.pi_quantity,
                    unit: item.pi_unit,
                    unitPrice: parseFloat(item.pi_unit_price),
                    total: itemTotal,
                    isOptional: !!item.pi_is_optional
                });
            }
            if (catItems.length > 0) {
                breakdown.categories.push({
                    id: cat.idcategory,
                    name: cat.pc_name,
                    items: catItems,
                    subtotal: catTotal
                });
                breakdown.subtotal += catTotal;
            }
        }

        return res.json({
            ok: true,
            price: calculatedPrice,
            priceType: pkg.sp_price_type,
            breakdown
        });
    } catch (err) {
        console.error('Calculate package price failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Save booking package (called when creating a booking with a package)
router.post('/bookings/:bookingId/package', authMiddleware, async (req, res) => {
    const bookingId = Number(req.params.bookingId);
    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }

    const { packageId, paxCount, removedItems, notes } = req.body || {};
    if (!packageId) {
        return res.status(400).json({ ok: false, error: 'Package ID is required' });
    }

    try {
        const pool = getPool();

        // Get package with full details for snapshot
        const [packages] = await pool.query(
            'SELECT * FROM service_package WHERE idpackage = ?',
            [packageId]
        );

        if (packages.length === 0) {
            return res.status(404).json({ ok: false, error: 'Package not found' });
        }

        const pkg = packages[0];

        // Get categories and items for snapshot
        const [categories] = await pool.query(`
            SELECT * FROM package_category
            WHERE pc_package_id = ?
            ORDER BY pc_display_order ASC
        `, [packageId]);

        for (const cat of categories) {
            const [items] = await pool.query(`
                SELECT * FROM package_item
                WHERE pi_category_id = ?
                ORDER BY pi_display_order ASC
            `, [cat.idcategory]);
            cat.items = items;
        }
        pkg.categories = categories;

        // Calculate prices
        const removedItemIds = removedItems || [];
        const unitPrice = calculatePackagePrice(pkg, 1, []);
        const totalPrice = calculatePackagePrice(pkg, paxCount || 1, removedItemIds);

        // Create snapshot
        const snapshot = {
            ...pkg,
            calculatedUnitPrice: unitPrice,
            calculatedTotalPrice: totalPrice
        };

        // Insert booking package
        const [result] = await pool.query(`
            INSERT INTO booking_package
            (bp_booking_id, bp_package_id, bp_pax_count, bp_unit_price, bp_total_price,
             bp_removed_items, bp_snapshot, bp_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            bookingId,
            packageId,
            paxCount || 1,
            unitPrice,
            totalPrice,
            removedItemIds.length > 0 ? JSON.stringify(removedItemIds) : null,
            JSON.stringify(snapshot),
            notes || null
        ]);

        return res.json({
            ok: true,
            id: result.insertId,
            unitPrice,
            totalPrice,
            message: 'Booking package saved successfully'
        });
    } catch (err) {
        console.error('Save booking package failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get booking package details
router.get('/bookings/:bookingId/package', authMiddleware, async (req, res) => {
    const bookingId = Number(req.params.bookingId);
    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }

    try {
        const pool = getPool();

        const [bookingPackages] = await pool.query(`
            SELECT bp.*, sp.sp_name as package_name
            FROM booking_package bp
            LEFT JOIN service_package sp ON bp.bp_package_id = sp.idpackage
            WHERE bp.bp_booking_id = ?
        `, [bookingId]);

        if (bookingPackages.length === 0) {
            return res.json({ ok: true, package: null });
        }

        const bp = bookingPackages[0];

        // Parse JSON fields
        if (bp.bp_removed_items && typeof bp.bp_removed_items === 'string') {
            bp.bp_removed_items = JSON.parse(bp.bp_removed_items);
        }
        if (bp.bp_snapshot && typeof bp.bp_snapshot === 'string') {
            bp.bp_snapshot = JSON.parse(bp.bp_snapshot);
        }

        return res.json({ ok: true, package: bp });
    } catch (err) {
        console.error('Get booking package failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

module.exports = router;
