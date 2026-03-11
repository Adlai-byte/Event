// server/controllers/serviceController.js
// Request/response handling for service-related endpoints.
// Delegates all business logic and DB access to svc/serviceService.js.

const { sendSuccess, sendError, sendPaginated } = require('../lib/response');
const serviceService = require('../svc/serviceService');

// ---------------------------------------------------------------------------
// Service CRUD
// ---------------------------------------------------------------------------

/**
 * GET /services
 */
async function listServices(req, res) {
    try {
        const result = await serviceService.listServices(req.query, req.pagination);

        // Short-circuit: providerId was not an email
        if (result.shortCircuit) {
            return sendSuccess(res, { rows: [] });
        }

        return sendPaginated(res, result.rows, {
            page: req.pagination.page,
            limit: req.pagination.limit,
            total: result.total,
        });
    } catch (err) {
        console.error('List services failed:', err.code, err.message);
        console.error('Error stack:', err.stack);
        console.error('Request query:', req.query);
        return sendError(res, 'SERVER_ERROR', err.message || 'Database error', 500,
            process.env.NODE_ENV === 'development' ? err.stack : undefined);
    }
}

/**
 * GET /services/:id
 */
async function getServiceById(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid service ID');
    }
    try {
        const service = await serviceService.getServiceById(id);
        if (!service) {
            return sendError(res, 'NOT_FOUND', 'Service not found', 404);
        }
        return sendSuccess(res, { service });
    } catch (err) {
        console.error('Get service failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * GET /services/:id/images
 */
async function getServiceImages(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid service ID');
    }
    try {
        const images = await serviceService.getServiceImages(id);
        return sendSuccess(res, { images });
    } catch (err) {
        console.error('Get service images failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * GET /services/:id/availability
 */
async function getServiceAvailability(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid service ID');
    }
    try {
        const availability = await serviceService.getServiceAvailability(id);
        return sendSuccess(res, { availability });
    } catch (err) {
        console.error('Get availability failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * GET /services/:id/available-slots
 */
async function getAvailableSlots(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid service ID');
    }
    try {
        const date = req.query.date; // YYYY-MM-DD format or undefined
        const result = await serviceService.getAvailableSlots(id, date);

        // result is either { slots: [...] } or { dates: [...] }
        return sendSuccess(res, result);
    } catch (err) {
        console.error('Get available slots failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * POST /services
 */
async function createService(req, res) {
    const { providerId, providerEmail, name, category, basePrice } = req.body || {};

    // Validate required fields
    if ((!providerId && !providerEmail) || !name || !category || basePrice === undefined || basePrice === null) {
        return sendError(res, 'VALIDATION_ERROR', 'Missing required fields: providerId or providerEmail, name, category, and basePrice are required');
    }

    // Validate category
    const validCategories = ['venue', 'catering', 'photography', 'videography', 'music', 'decoration', 'transportation', 'entertainment', 'planning', 'other'];
    if (!validCategories.includes(category.toLowerCase())) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid category');
    }

    // Validate price
    const price = parseFloat(basePrice);
    if (isNaN(price) || price < 0) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid price');
    }

    // Validate optional new fields
    const { travelRadiusKm, minBookingHours, maxBookingHours, leadTimeDays, tags, inclusions, status } = req.body;

    if (travelRadiusKm !== undefined && travelRadiusKm !== null) {
        const v = parseInt(travelRadiusKm);
        if (!Number.isInteger(v) || v < 0 || v > 500) {
            return sendError(res, 'VALIDATION_ERROR', 'travelRadiusKm must be an integer between 0 and 500');
        }
    }
    if (minBookingHours !== undefined && minBookingHours !== null) {
        const v = parseFloat(minBookingHours);
        if (isNaN(v) || v < 0.5 || v > 24) {
            return sendError(res, 'VALIDATION_ERROR', 'minBookingHours must be between 0.5 and 24');
        }
    }
    if (maxBookingHours !== undefined && maxBookingHours !== null) {
        const v = parseFloat(maxBookingHours);
        if (isNaN(v) || v < 1 || v > 720) {
            return sendError(res, 'VALIDATION_ERROR', 'maxBookingHours must be between 1 and 720');
        }
    }
    if (leadTimeDays !== undefined && leadTimeDays !== null) {
        const v = parseInt(leadTimeDays);
        if (!Number.isInteger(v) || v < 0 || v > 90) {
            return sendError(res, 'VALIDATION_ERROR', 'leadTimeDays must be an integer between 0 and 90');
        }
    }
    if (tags !== undefined && tags !== null) {
        if (!Array.isArray(tags) || !tags.every(t => typeof t === 'string')) {
            return sendError(res, 'VALIDATION_ERROR', 'tags must be an array of strings');
        }
    }
    if (inclusions !== undefined && inclusions !== null) {
        if (!Array.isArray(inclusions) || !inclusions.every(i => typeof i === 'string')) {
            return sendError(res, 'VALIDATION_ERROR', 'inclusions must be an array of strings');
        }
    }
    if (status !== undefined && status !== null) {
        if (!['draft', 'active'].includes(status)) {
            return sendError(res, 'VALIDATION_ERROR', 'status must be "draft" or "active"');
        }
    }

    try {
        const result = await serviceService.createService(req.body);
        return sendSuccess(res, { id: result.id, message: 'Service created successfully' });
    } catch (err) {
        if (err.code === 'NOT_FOUND') {
            return sendError(res, 'NOT_FOUND', err.message);
        }
        console.log('========================================');
        console.log('CREATE SERVICE FAILED:');
        console.log('========================================');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        console.error('Full Error:', err);
        console.log('========================================');
        return sendError(res, 'SERVER_ERROR', err.message || 'Database error', 500);
    }
}

/**
 * POST /services/:id/status
 */
async function updateServiceStatus(req, res) {
    const id = Number(req.params.id);
    const { isActive } = req.body || {};
    if (!Number.isFinite(id) || typeof isActive !== 'boolean') {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid parameters');
    }
    try {
        await serviceService.updateServiceStatus(id, isActive);
        return sendSuccess(res, null);
    } catch (err) {
        console.error('Update service status failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * PUT /services/:id
 */
async function updateService(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid service ID');
    }

    const { name, category, basePrice } = req.body || {};

    // Validate required fields
    if (!name || !category || basePrice === undefined || basePrice === null) {
        return sendError(res, 'VALIDATION_ERROR', 'Missing required fields: name, category, and basePrice are required');
    }

    // Validate category
    const validCategories = ['venue', 'catering', 'photography', 'videography', 'music', 'decoration', 'transportation', 'entertainment', 'planning', 'other'];
    if (!validCategories.includes(category.toLowerCase())) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid category');
    }

    // Validate price
    const price = parseFloat(basePrice);
    if (isNaN(price) || price < 0) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid price');
    }

    // Validate optional new fields
    const { travelRadiusKm, minBookingHours, maxBookingHours, leadTimeDays, tags, inclusions, status } = req.body;

    if (travelRadiusKm !== undefined && travelRadiusKm !== null) {
        const v = parseInt(travelRadiusKm);
        if (!Number.isInteger(v) || v < 0 || v > 500) {
            return sendError(res, 'VALIDATION_ERROR', 'travelRadiusKm must be an integer between 0 and 500');
        }
    }
    if (minBookingHours !== undefined && minBookingHours !== null) {
        const v = parseFloat(minBookingHours);
        if (isNaN(v) || v < 0.5 || v > 24) {
            return sendError(res, 'VALIDATION_ERROR', 'minBookingHours must be between 0.5 and 24');
        }
    }
    if (maxBookingHours !== undefined && maxBookingHours !== null) {
        const v = parseFloat(maxBookingHours);
        if (isNaN(v) || v < 1 || v > 720) {
            return sendError(res, 'VALIDATION_ERROR', 'maxBookingHours must be between 1 and 720');
        }
    }
    if (leadTimeDays !== undefined && leadTimeDays !== null) {
        const v = parseInt(leadTimeDays);
        if (!Number.isInteger(v) || v < 0 || v > 90) {
            return sendError(res, 'VALIDATION_ERROR', 'leadTimeDays must be an integer between 0 and 90');
        }
    }
    if (tags !== undefined && tags !== null) {
        if (!Array.isArray(tags) || !tags.every(t => typeof t === 'string')) {
            return sendError(res, 'VALIDATION_ERROR', 'tags must be an array of strings');
        }
    }
    if (inclusions !== undefined && inclusions !== null) {
        if (!Array.isArray(inclusions) || !inclusions.every(i => typeof i === 'string')) {
            return sendError(res, 'VALIDATION_ERROR', 'inclusions must be an array of strings');
        }
    }
    if (status !== undefined && status !== null) {
        if (!['draft', 'active'].includes(status)) {
            return sendError(res, 'VALIDATION_ERROR', 'status must be "draft" or "active"');
        }
    }

    try {
        const result = await serviceService.updateService(id, req.body);
        return sendSuccess(res, result);
    } catch (err) {
        if (err.code === 'NOT_FOUND') {
            return sendError(res, 'NOT_FOUND', err.message, 404);
        }
        if (err.code === 'VALIDATION_ERROR') {
            return sendError(res, 'VALIDATION_ERROR', err.message);
        }
        console.error('Update service failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', err.message || 'Database error', 500);
    }
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

/**
 * GET /services/:serviceId/reviews
 */
async function getServiceReviews(req, res) {
    const serviceId = Number(req.params.serviceId);

    if (!Number.isFinite(serviceId)) {
        console.error('Invalid service ID:', req.params.serviceId);
        return sendError(res, 'VALIDATION_ERROR', 'Invalid service ID');
    }

    try {
        const reviews = await serviceService.getServiceReviews(serviceId);
        return sendSuccess(res, { reviews });
    } catch (err) {
        console.error('Get service reviews failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

// ---------------------------------------------------------------------------
// Provider profile / search / services
// ---------------------------------------------------------------------------

/**
 * GET /provider/profile
 */
async function getProviderProfile(req, res) {
    const providerEmail = req.query.email;

    if (!providerEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Provider email is required');
    }

    try {
        const provider = await serviceService.getProviderProfile(providerEmail);
        return sendSuccess(res, { provider });
    } catch (err) {
        if (err.code === 'NOT_FOUND') {
            return sendError(res, 'NOT_FOUND', err.message, 404);
        }
        console.error('Get provider profile failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

/**
 * GET /providers/search
 */
async function searchProviders(req, res) {
    const search = req.query.search;

    if (!search || !search.trim()) {
        return sendSuccess(res, { providers: [] });
    }

    try {
        const providers = await serviceService.searchProviders(search);
        return sendSuccess(res, { providers });
    } catch (err) {
        console.error('Search providers failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

/**
 * GET /provider/services
 */
async function getProviderServices(req, res) {
    const providerEmail = req.query.email;

    if (!providerEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Provider email is required');
    }

    try {
        const services = await serviceService.getProviderServices(providerEmail);
        return sendSuccess(res, { services });
    } catch (err) {
        console.error('Get provider services failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

// ---------------------------------------------------------------------------
// PayMongo payment credentials
// ---------------------------------------------------------------------------

/**
 * GET /provider/payment-link
 */
async function getProviderPaymentLink(req, res) {
    const providerEmail = req.query.providerEmail;

    if (!providerEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Provider email is required');
    }

    try {
        const result = await serviceService.getProviderPaymentLink(providerEmail);
        return sendSuccess(res, result);
    } catch (err) {
        if (err.code === 'NOT_FOUND') {
            return sendError(res, 'NOT_FOUND', err.message, 404);
        }
        console.error('Get provider payment link failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * POST /provider/payment-link
 */
async function updateProviderPaymentLink(req, res) {
    const { providerEmail, paymentLink } = req.body || {};

    if (!providerEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Provider email is required');
    }

    if (!paymentLink || typeof paymentLink !== 'string' || paymentLink.trim() === '') {
        return sendError(res, 'VALIDATION_ERROR', 'Payment link is required');
    }

    // Validate PayMongo payment link format
    const paymongoLinkPattern = /^https?:\/\/(paymongo\.page|l\.paymongo\.com)\//;
    if (!paymongoLinkPattern.test(paymentLink.trim())) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid PayMongo payment link format. Must be a valid PayMongo payment page URL.');
    }

    try {
        const result = await serviceService.updateProviderPaymentLink(providerEmail, paymentLink);
        return sendSuccess(res, result);
    } catch (err) {
        if (err.code === 'NOT_FOUND') {
            return sendError(res, 'NOT_FOUND', err.message, 404);
        }
        console.error('Update provider payment link failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * POST /provider/paymongo-credentials
 */
async function savePaymongoCredentials(req, res) {
    const { providerEmail, secretKey, publicKey, mode } = req.body || {};

    if (!providerEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Provider email is required');
    }

    if (!secretKey || typeof secretKey !== 'string' || secretKey.trim() === '') {
        return sendError(res, 'VALIDATION_ERROR', 'Secret key is required');
    }

    // Validate secret key format
    const secretKeyPattern = /^sk_(test|live)_/;
    if (!secretKeyPattern.test(secretKey.trim())) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid secret key format. Must start with sk_test_ or sk_live_');
    }

    // Validate public key format if provided
    if (publicKey && publicKey.trim() !== '') {
        const publicKeyPattern = /^pk_(test|live)_/;
        if (!publicKeyPattern.test(publicKey.trim())) {
            return sendError(res, 'VALIDATION_ERROR', 'Invalid public key format. Must start with pk_test_ or pk_live_');
        }

        // Ensure secret and public keys match in mode
        const secretMode = secretKey.trim().startsWith('sk_test_') ? 'test' : 'live';
        const publicMode = publicKey.trim().startsWith('pk_test_') ? 'test' : 'live';
        if (secretMode !== publicMode) {
            return sendError(res, 'VALIDATION_ERROR', 'Secret key and public key must be from the same mode (both TEST or both LIVE)');
        }
    }

    // Validate mode
    const validModes = ['test', 'live'];
    const finalMode = mode || (secretKey.trim().startsWith('sk_test_') ? 'test' : 'live');
    if (!validModes.includes(finalMode)) {
        return sendError(res, 'VALIDATION_ERROR', 'Mode must be either "test" or "live"');
    }

    try {
        const result = await serviceService.savePaymongoCredentials(providerEmail, secretKey, publicKey, finalMode);
        return sendSuccess(res, result);
    } catch (err) {
        if (err.code === 'NOT_FOUND') {
            return sendError(res, 'NOT_FOUND', err.message, 404);
        }
        console.error('Save PayMongo credentials failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * GET /provider/paymongo-credentials
 */
async function getPaymongoCredentials(req, res) {
    const providerEmail = req.query.providerEmail;

    if (!providerEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Provider email is required');
    }

    try {
        const result = await serviceService.getPaymongoCredentials(providerEmail);
        return sendSuccess(res, result);
    } catch (err) {
        if (err.code === 'NOT_FOUND') {
            return sendError(res, 'NOT_FOUND', err.message, 404);
        }
        console.error('Get PayMongo credentials failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// ---------------------------------------------------------------------------
// Multi-image management
// ---------------------------------------------------------------------------

/**
 * POST /services/:id/images
 */
async function addServiceImage(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid service ID');
    }

    const { image } = req.body || {};
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
        return sendError(res, 'VALIDATION_ERROR', 'A valid base64 image is required');
    }

    try {
        const result = await serviceService.addImage(id, image);
        return sendSuccess(res, result);
    } catch (err) {
        if (err.code === 'NOT_FOUND') {
            return sendError(res, 'NOT_FOUND', err.message, 404);
        }
        if (err.code === 'VALIDATION_ERROR') {
            return sendError(res, 'VALIDATION_ERROR', err.message);
        }
        console.error('Add service image failed:', err.message);
        return sendError(res, 'SERVER_ERROR', err.message || 'Database error', 500);
    }
}

/**
 * DELETE /services/:id/images/:imageId
 */
async function deleteServiceImage(req, res) {
    const id = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    if (!Number.isFinite(id) || !Number.isFinite(imageId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid service or image ID');
    }

    try {
        await serviceService.deleteImage(id, imageId);
        return sendSuccess(res, { success: true });
    } catch (err) {
        if (err.code === 'NOT_FOUND') {
            return sendError(res, 'NOT_FOUND', err.message, 404);
        }
        console.error('Delete service image failed:', err.message);
        return sendError(res, 'SERVER_ERROR', err.message || 'Database error', 500);
    }
}

/**
 * PUT /services/:id/images/reorder
 */
async function reorderServiceImages(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid service ID');
    }

    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) {
        return sendError(res, 'VALIDATION_ERROR', 'order must be a non-empty array of image IDs');
    }

    // Ensure all entries are numbers
    const numericOrder = order.map(Number);
    if (numericOrder.some(n => !Number.isFinite(n))) {
        return sendError(res, 'VALIDATION_ERROR', 'All image IDs must be valid numbers');
    }

    try {
        await serviceService.reorderImages(id, numericOrder);
        return sendSuccess(res, { success: true });
    } catch (err) {
        if (err.code === 'VALIDATION_ERROR') {
            return sendError(res, 'VALIDATION_ERROR', err.message);
        }
        console.error('Reorder service images failed:', err.message);
        return sendError(res, 'SERVER_ERROR', err.message || 'Database error', 500);
    }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    listServices,
    getServiceById,
    getServiceImages,
    getServiceAvailability,
    getAvailableSlots,
    createService,
    updateServiceStatus,
    updateService,
    getServiceReviews,
    getProviderProfile,
    searchProviders,
    getProviderServices,
    getProviderPaymentLink,
    updateProviderPaymentLink,
    savePaymongoCredentials,
    getPaymongoCredentials,
    addServiceImage,
    deleteServiceImage,
    reorderServiceImages,
};
