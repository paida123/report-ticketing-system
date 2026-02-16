import { apiUrl } from "../api/api";

class TicketApprovalService {

    // Create a ticket approval (approve/reject)
    createTicketApproval(data) {
        return apiUrl.post("ticket-approval", data);
    }

    // Get all approvals
    getAllApprovals() {
        return apiUrl.get("ticket-approval/getAll");
    }

}

export default new TicketApprovalService();
