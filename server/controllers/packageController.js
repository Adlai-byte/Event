// server/controllers/packageController.js
// Package controller: request/response handling (parse req, call service, send response)
const { sendSuccess, sendError } = require('../lib/response');
const packageService = require('../svc/packageService');

// ─── Package CRUD ────────────────────────────────────────────────────

async function getServicePackages(req, res) {
    const serviceId = Number(req.params.serviceId);
    if (!Number.isFinite(serviceId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid service ID', 400);
    }

    try {
        const packages = await packageService.getServicePackages(serviceId);
        return sendSuccess(res, { packages });
    } catch (err) {
        console.error('Get service packages failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

async function getPackageById(req, res) {
    const packageId = Number(req.params.id);
    if (!Number.isFinite(packageId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid package ID', 400);
    }

    try {
        const pkg = await packageService.getPackageById(packageId);
        if (!pkg) {
            return sendError(res, 'NOT_FOUND', 'Package not found', 404);
        }
        return sendSuccess(res, { package: pkg });
    } catch (err) {
        console.error('Get package failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

async function createPackage(req, res) {
    const serviceId = Number(req.params.serviceId);
    if (!Number.isFinite(serviceId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid service ID', 400);
    }

    const {
        name, description, minPax, maxPax, basePrice,
        priceType, discountPercent, isActive, displayOrder, billingType, categories
    } = req.body || {};

    if (!name || !name.trim()) {
        return sendError(res, 'VALIDATION_ERROR', 'Package name is required', 400);
    }

    try {
        const packageId = await packageService.createPackage(serviceId, {
            name, description, minPax, maxPax, basePrice,
            priceType, discountPercent, isActive, displayOrder, billingType, categories
        });
        return sendSuccess(res, { id: packageId, message: 'Package created successfully' });
    } catch (err) {
        console.error('Create package failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', err.message || 'Database error', 500);
    }
}

async function updatePackage(req, res) {
    const packageId = Number(req.params.id);
    if (!Number.isFinite(packageId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid package ID', 400);
    }

    const {
        name, description, minPax, maxPax, basePrice,
        priceType, discountPercent, isActive, displayOrder, billingType, categories
    } = req.body || {};

    try {
        const found = await packageService.updatePackage(packageId, {
            name, description, minPax, maxPax, basePrice,
            priceType, discountPercent, isActive, displayOrder, billingType, categories
        });
        if (!found) {
            return sendError(res, 'NOT_FOUND', 'Package not found', 404);
        }
        return sendSuccess(res, { message: 'Package updated successfully' });
    } catch (err) {
        console.error('Update package failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', err.message || 'Database error', 500);
    }
}

async function deletePackage(req, res) {
    const packageId = Number(req.params.id);
    if (!Number.isFinite(packageId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid package ID', 400);
    }

    try {
        const deleted = await packageService.deletePackage(packageId);
        if (!deleted) {
            return sendError(res, 'NOT_FOUND', 'Package not found', 404);
        }
        return sendSuccess(res, { message: 'Package deleted successfully' });
    } catch (err) {
        console.error('Delete package failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// ─── Category CRUD ───────────────────────────────────────────────────

async function addCategory(req, res) {
    const packageId = Number(req.params.id);
    if (!Number.isFinite(packageId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid package ID', 400);
    }

    const { name, description, displayOrder } = req.body || {};
    if (!name || !name.trim()) {
        return sendError(res, 'VALIDATION_ERROR', 'Category name is required', 400);
    }

    try {
        const result = await packageService.addCategory(packageId, { name, description, displayOrder });
        if (!result) {
            return sendError(res, 'NOT_FOUND', 'Package not found', 404);
        }
        return sendSuccess(res, { id: result.id, message: 'Category added successfully' });
    } catch (err) {
        console.error('Add category failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

async function updateCategory(req, res) {
    const categoryId = Number(req.params.id);
    if (!Number.isFinite(categoryId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid category ID', 400);
    }

    const { name, description, displayOrder } = req.body || {};

    try {
        const updated = await packageService.updateCategory(categoryId, { name, description, displayOrder });
        if (!updated) {
            return sendError(res, 'NOT_FOUND', 'Category not found', 404);
        }
        return sendSuccess(res, { message: 'Category updated successfully' });
    } catch (err) {
        if (err.code === 'NO_FIELDS') {
            return sendError(res, 'VALIDATION_ERROR', 'No fields to update', 400);
        }
        console.error('Update category failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

async function deleteCategory(req, res) {
    const categoryId = Number(req.params.id);
    if (!Number.isFinite(categoryId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid category ID', 400);
    }

    try {
        const deleted = await packageService.deleteCategory(categoryId);
        if (!deleted) {
            return sendError(res, 'NOT_FOUND', 'Category not found', 404);
        }
        return sendSuccess(res, { message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Delete category failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// ─── Item CRUD ───────────────────────────────────────────────────────

async function addItem(req, res) {
    const categoryId = Number(req.params.id);
    if (!Number.isFinite(categoryId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid category ID', 400);
    }

    const { name, description, quantity, unit, unitPrice, isOptional, displayOrder } = req.body || {};
    if (!name || !name.trim()) {
        return sendError(res, 'VALIDATION_ERROR', 'Item name is required', 400);
    }

    try {
        const result = await packageService.addItem(categoryId, {
            name, description, quantity, unit, unitPrice, isOptional, displayOrder
        });
        if (!result) {
            return sendError(res, 'NOT_FOUND', 'Category not found', 404);
        }
        return sendSuccess(res, { id: result.id, message: 'Item added successfully' });
    } catch (err) {
        console.error('Add item failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

async function bulkAddItems(req, res) {
    const categoryId = Number(req.params.id);
    if (!Number.isFinite(categoryId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid category ID', 400);
    }

    const { items, replaceAll } = req.body || {};
    if (!items || !Array.isArray(items)) {
        return sendError(res, 'VALIDATION_ERROR', 'Items array is required', 400);
    }

    try {
        const result = await packageService.bulkAddItems(categoryId, items, replaceAll);
        if (!result) {
            return sendError(res, 'NOT_FOUND', 'Category not found', 404);
        }
        return sendSuccess(res, { ids: result.ids, message: 'Items added successfully' });
    } catch (err) {
        console.error('Bulk add items failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

async function updateItem(req, res) {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid item ID', 400);
    }

    const { name, description, quantity, unit, unitPrice, isOptional, displayOrder } = req.body || {};

    try {
        const updated = await packageService.updateItem(itemId, {
            name, description, quantity, unit, unitPrice, isOptional, displayOrder
        });
        if (!updated) {
            return sendError(res, 'NOT_FOUND', 'Item not found', 404);
        }
        return sendSuccess(res, { message: 'Item updated successfully' });
    } catch (err) {
        if (err.code === 'NO_FIELDS') {
            return sendError(res, 'VALIDATION_ERROR', 'No fields to update', 400);
        }
        console.error('Update item failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

async function deleteItem(req, res) {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid item ID', 400);
    }

    try {
        const deleted = await packageService.deleteItem(itemId);
        if (!deleted) {
            return sendError(res, 'NOT_FOUND', 'Item not found', 404);
        }
        return sendSuccess(res, { message: 'Item deleted successfully' });
    } catch (err) {
        console.error('Delete item failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// ─── Price Calculation ───────────────────────────────────────────────

async function calculatePrice(req, res) {
    const packageId = Number(req.params.id);
    if (!Number.isFinite(packageId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid package ID', 400);
    }

    const pax = req.query.pax ? Number(req.query.pax) : null;
    const removedItems = req.query.removedItems ?
        req.query.removedItems.split(',').map(Number).filter(n => Number.isFinite(n)) : [];

    try {
        const result = await packageService.calculatePrice(packageId, pax, removedItems);
        if (!result) {
            return sendError(res, 'NOT_FOUND', 'Package not found', 404);
        }
        return sendSuccess(res, result);
    } catch (err) {
        console.error('Calculate package price failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// ─── Booking Package ─────────────────────────────────────────────────

async function saveBookingPackage(req, res) {
    const bookingId = Number(req.params.bookingId);
    if (!Number.isFinite(bookingId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid booking ID', 400);
    }

    const { packageId, paxCount, removedItems, notes } = req.body || {};
    if (!packageId) {
        return sendError(res, 'VALIDATION_ERROR', 'Package ID is required', 400);
    }

    try {
        const result = await packageService.saveBookingPackage(bookingId, {
            packageId, paxCount, removedItems, notes
        });
        if (!result) {
            return sendError(res, 'NOT_FOUND', 'Package not found', 404);
        }
        return sendSuccess(res, {
            id: result.id,
            unitPrice: result.unitPrice,
            totalPrice: result.totalPrice,
            message: 'Booking package saved successfully'
        });
    } catch (err) {
        console.error('Save booking package failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

async function getBookingPackage(req, res) {
    const bookingId = Number(req.params.bookingId);
    if (!Number.isFinite(bookingId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid booking ID', 400);
    }

    try {
        const bp = await packageService.getBookingPackage(bookingId);
        return sendSuccess(res, { package: bp || null });
    } catch (err) {
        console.error('Get booking package failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

module.exports = {
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
