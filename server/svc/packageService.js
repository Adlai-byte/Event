// server/svc/packageService.js
// Package service: all database queries and business logic (no req/res knowledge)
const { getPool } = require('../db');

/**
 * Calculate package price from items.
 * @param {object} pkg - Package object with categories/items attached
 * @param {number|null} paxCount
 * @param {number[]} removedItemIds
 * @returns {number}
 */
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

/**
 * Attach categories and items to an array of packages (batch).
 * Mutates the package objects in place.
 */
async function attachCategoriesAndItems(pool, packages) {
    if (packages.length === 0) return;

    const packageIds = packages.map(p => p.idpackage);
    const [allCategories] = await pool.query(`
        SELECT * FROM package_category
        WHERE pc_package_id IN (?)
        ORDER BY pc_display_order ASC
    `, [packageIds]);

    if (allCategories.length > 0) {
        const categoryIds = allCategories.map(c => c.idcategory);
        const [allItems] = await pool.query(`
            SELECT * FROM package_item
            WHERE pi_category_id IN (?)
            ORDER BY pi_display_order ASC
        `, [categoryIds]);

        // Group items by category
        const itemsByCat = {};
        for (const item of allItems) {
            if (!itemsByCat[item.pi_category_id]) itemsByCat[item.pi_category_id] = [];
            itemsByCat[item.pi_category_id].push(item);
        }
        for (const cat of allCategories) {
            cat.items = itemsByCat[cat.idcategory] || [];
        }
    }

    // Group categories by package
    const catsByPkg = {};
    for (const cat of allCategories) {
        if (!catsByPkg[cat.pc_package_id]) catsByPkg[cat.pc_package_id] = [];
        catsByPkg[cat.pc_package_id].push(cat);
    }
    for (const pkg of packages) {
        pkg.categories = catsByPkg[pkg.idpackage] || [];
        if (pkg.sp_price_type === 'calculated') {
            pkg.calculated_price = calculatePackagePrice(pkg);
        }
    }
}

/**
 * Attach categories and items to a single package.
 * Mutates the package object in place.
 */
async function attachCategoriesAndItemsSingle(pool, pkg) {
    const packageId = pkg.idpackage;

    const [categories] = await pool.query(`
        SELECT * FROM package_category
        WHERE pc_package_id = ?
        ORDER BY pc_display_order ASC
    `, [packageId]);

    if (categories.length > 0) {
        const categoryIds = categories.map(c => c.idcategory);
        const [allItems] = await pool.query(`
            SELECT * FROM package_item
            WHERE pi_category_id IN (?)
            ORDER BY pi_display_order ASC
        `, [categoryIds]);
        const itemsByCat = {};
        for (const item of allItems) {
            if (!itemsByCat[item.pi_category_id]) itemsByCat[item.pi_category_id] = [];
            itemsByCat[item.pi_category_id].push(item);
        }
        for (const cat of categories) {
            cat.items = itemsByCat[cat.idcategory] || [];
        }
    }
    pkg.categories = categories;

    if (pkg.sp_price_type === 'calculated') {
        pkg.calculated_price = calculatePackagePrice(pkg);
    }
}

// ─── Service Functions ───────────────────────────────────────────────

/**
 * Get all packages for a service, with categories and items.
 */
async function getServicePackages(serviceId) {
    const pool = getPool();

    const [packages] = await pool.query(`
        SELECT * FROM service_package
        WHERE sp_service_id = ?
        ORDER BY sp_display_order ASC, sp_created_at DESC
    `, [serviceId]);

    await attachCategoriesAndItems(pool, packages);

    return packages;
}

/**
 * Get a single package by ID with full details.
 * Returns null if not found.
 */
async function getPackageById(packageId) {
    const pool = getPool();

    const [packages] = await pool.query(`
        SELECT sp.*, s.s_name as service_name
        FROM service_package sp
        LEFT JOIN service s ON sp.sp_service_id = s.idservice
        WHERE sp.idpackage = ?
    `, [packageId]);

    if (packages.length === 0) return null;

    const pkg = packages[0];
    await attachCategoriesAndItemsSingle(pool, pkg);

    return pkg;
}

/**
 * Insert categories and items into the database.
 * Used by both create and update flows.
 * @param {object} connection - DB connection (for transaction)
 * @param {number} packageId
 * @param {Array} categories
 */
async function insertCategoriesAndItems(connection, packageId, categories) {
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

/**
 * Create a new package with optional categories and items.
 * Returns the new package ID.
 */
async function createPackage(serviceId, data) {
    const {
        name, description, minPax, maxPax, basePrice,
        priceType, discountPercent, isActive, displayOrder, billingType, categories
    } = data;

    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();

        const [pkgResult] = await connection.query(`
            INSERT INTO service_package
            (sp_service_id, sp_name, sp_description, sp_min_pax, sp_max_pax,
             sp_base_price, sp_price_type, sp_discount_percent, sp_is_active, sp_display_order, sp_billing_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            displayOrder || 0,
            billingType || 'hourly'
        ]);

        const packageId = pkgResult.insertId;

        if (categories && Array.isArray(categories)) {
            await insertCategoriesAndItems(connection, packageId, categories);
        }

        await connection.commit();
        return packageId;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

/**
 * Update an existing package.
 * Returns false if package not found, true on success.
 */
async function updatePackage(packageId, data) {
    const {
        name, description, minPax, maxPax, basePrice,
        priceType, discountPercent, isActive, displayOrder, billingType, categories
    } = data;

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
            return false;
        }

        // Build dynamic update
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
        if (billingType !== undefined) {
            updateFields.push('sp_billing_type = ?');
            updateValues.push(billingType);
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
            await connection.query('DELETE FROM package_category WHERE pc_package_id = ?', [packageId]);
            await insertCategoriesAndItems(connection, packageId, categories);
        }

        await connection.commit();
        return true;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

/**
 * Delete a package by ID.
 * Returns true if deleted, false if not found.
 */
async function deletePackage(packageId) {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM service_package WHERE idpackage = ?', [packageId]);
    return result.affectedRows > 0;
}

/**
 * Add a category to a package.
 * Returns { id } or null if package not found.
 */
async function addCategory(packageId, data) {
    const { name, description, displayOrder } = data;
    const pool = getPool();

    // Check package exists
    const [pkgExists] = await pool.query(
        'SELECT idpackage FROM service_package WHERE idpackage = ?',
        [packageId]
    );
    if (pkgExists.length === 0) return null;

    const [result] = await pool.query(`
        INSERT INTO package_category
        (pc_package_id, pc_name, pc_description, pc_display_order)
        VALUES (?, ?, ?, ?)
    `, [packageId, name.trim(), description || null, displayOrder || 0]);

    return { id: result.insertId };
}

/**
 * Update a category.
 * Returns true if updated, false if not found, or throws 'NO_FIELDS' if nothing to update.
 */
async function updateCategory(categoryId, data) {
    const { name, description, displayOrder } = data;
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
        const err = new Error('No fields to update');
        err.code = 'NO_FIELDS';
        throw err;
    }

    updateValues.push(categoryId);
    const [result] = await pool.query(
        `UPDATE package_category SET ${updateFields.join(', ')} WHERE idcategory = ?`,
        updateValues
    );

    return result.affectedRows > 0;
}

/**
 * Delete a category by ID.
 * Returns true if deleted, false if not found.
 */
async function deleteCategory(categoryId) {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM package_category WHERE idcategory = ?', [categoryId]);
    return result.affectedRows > 0;
}

/**
 * Add a single item to a category.
 * Returns { id } or null if category not found.
 */
async function addItem(categoryId, data) {
    const { name, description, quantity, unit, unitPrice, isOptional, displayOrder } = data;
    const pool = getPool();

    // Check category exists
    const [catExists] = await pool.query(
        'SELECT idcategory FROM package_category WHERE idcategory = ?',
        [categoryId]
    );
    if (catExists.length === 0) return null;

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

    return { id: result.insertId };
}

/**
 * Bulk add/replace items in a category.
 * Returns { ids } or null if category not found.
 */
async function bulkAddItems(categoryId, items, replaceAll) {
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
            return null;
        }

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
        return { ids: insertedIds };
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

/**
 * Update a single item.
 * Returns true if updated, false if not found, or throws 'NO_FIELDS'.
 */
async function updateItem(itemId, data) {
    const { name, description, quantity, unit, unitPrice, isOptional, displayOrder } = data;
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
        const err = new Error('No fields to update');
        err.code = 'NO_FIELDS';
        throw err;
    }

    updateValues.push(itemId);
    const [result] = await pool.query(
        `UPDATE package_item SET ${updateFields.join(', ')} WHERE iditem = ?`,
        updateValues
    );

    return result.affectedRows > 0;
}

/**
 * Delete an item by ID.
 * Returns true if deleted, false if not found.
 */
async function deleteItem(itemId) {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM package_item WHERE iditem = ?', [itemId]);
    return result.affectedRows > 0;
}

/**
 * Calculate package price with full breakdown.
 * Returns null if package not found.
 */
async function calculatePrice(packageId, paxCount, removedItemIds) {
    const pool = getPool();

    const [packages] = await pool.query(
        'SELECT * FROM service_package WHERE idpackage = ?',
        [packageId]
    );

    if (packages.length === 0) return null;

    const pkg = packages[0];

    // Get categories and items
    const [categories] = await pool.query(`
        SELECT * FROM package_category
        WHERE pc_package_id = ?
        ORDER BY pc_display_order ASC
    `, [packageId]);

    if (categories.length > 0) {
        const categoryIds = categories.map(c => c.idcategory);
        const [allItems] = await pool.query(`
            SELECT * FROM package_item
            WHERE pi_category_id IN (?)
            ORDER BY pi_display_order ASC
        `, [categoryIds]);
        const itemsByCat = {};
        for (const item of allItems) {
            if (!itemsByCat[item.pi_category_id]) itemsByCat[item.pi_category_id] = [];
            itemsByCat[item.pi_category_id].push(item);
        }
        for (const cat of categories) {
            cat.items = itemsByCat[cat.idcategory] || [];
        }
    }
    pkg.categories = categories;

    const calculatedPrice = calculatePackagePrice(pkg, paxCount, removedItemIds);

    // Build breakdown
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
            if (removedItemIds.includes(item.iditem)) continue;
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

    return {
        price: calculatedPrice,
        priceType: pkg.sp_price_type,
        breakdown
    };
}

/**
 * Save a booking package (snapshot of package at booking time).
 * Returns null if the source package is not found.
 */
async function saveBookingPackage(bookingId, data) {
    const { packageId, paxCount, removedItems, notes } = data;
    const pool = getPool();

    // Get package with full details for snapshot
    const [packages] = await pool.query(
        'SELECT * FROM service_package WHERE idpackage = ?',
        [packageId]
    );

    if (packages.length === 0) return null;

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

    return {
        id: result.insertId,
        unitPrice,
        totalPrice
    };
}

/**
 * Get booking package details for a booking.
 * Returns the booking-package row (with parsed JSON) or null.
 */
async function getBookingPackage(bookingId) {
    const pool = getPool();

    const [bookingPackages] = await pool.query(`
        SELECT bp.*, sp.sp_name as package_name
        FROM booking_package bp
        LEFT JOIN service_package sp ON bp.bp_package_id = sp.idpackage
        WHERE bp.bp_booking_id = ?
    `, [bookingId]);

    if (bookingPackages.length === 0) return null;

    const bp = bookingPackages[0];

    // Parse JSON fields
    if (bp.bp_removed_items && typeof bp.bp_removed_items === 'string') {
        bp.bp_removed_items = JSON.parse(bp.bp_removed_items);
    }
    if (bp.bp_snapshot && typeof bp.bp_snapshot === 'string') {
        bp.bp_snapshot = JSON.parse(bp.bp_snapshot);
    }

    return bp;
}

module.exports = {
    calculatePackagePrice,
    getServicePackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
    addCategory,
    updateCategory,
    deleteCategory,
    addItem,
    bulkAddItems,
    updateItem,
    deleteItem,
    calculatePrice,
    saveBookingPackage,
    getBookingPackage,
};
