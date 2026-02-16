import { apiUrl } from "../api/api";

class ApprovalStepsService {

    // Create an approval step
    createApprovalStep(data) {
        return apiUrl.post("approval-steps", data);
    }

    // Get approval steps by ticket type ID
    getApprovalStepsByTicketType(ticketTypeId) {
        return apiUrl.get(`approval-steps/get/${ticketTypeId}`);
    }

    // Get all approval steps
    getAllApprovalSteps() {
        return apiUrl.get("approval-steps/getAll");
    }

    // Update an approval step by ID
    updateApprovalStep(id, data) {
        return apiUrl.put(`approval-steps/update/${id}`, data);
    }

    // Delete an approval step by ID
    deleteApprovalStep(id) {
        return apiUrl.delete(`approval-steps/delete/${id}`);
    }

}

export default new ApprovalStepsService();
