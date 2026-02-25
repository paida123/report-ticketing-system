import { apiUrl } from "../api/api";

class StepApproverService {
    /**
     * Create a new step approver assignment
     * @param {Object} data - { step_id, user_id }
     * @returns {Promise} API response
     */
    createStepApprover(data) {
        return apiUrl.post("step-approvers/", data);
    }

    /**
     * Update an existing step approver assignment
     * @param {number} id - Step approver ID
     * @param {Object} data - { user_id }
     * @returns {Promise} API response
     */
    updateStepApprover(id, data) {
        return apiUrl.put(`step-approvers/update/${id}`, data);
    }

    /**
     * Get all step approver records for a specific user
     * @param {number} userId - User ID
     * @returns {Promise} API response with step approver records
     */
    getStepApproverByUserId(userId) {
        return apiUrl.get(`step-approvers/getByUserId/${userId}`);
    }

    /**
     * Get all tickets pending approval for a specific approver
     * @param {number} userId - User ID of the approver
     * @returns {Promise} API response with tickets pending approval
     */
    getTicketsForApprover(userId) {
        return apiUrl.get(`step-approvers/tickets-for-approver/${userId}`);
    }
}

export default new StepApproverService();
