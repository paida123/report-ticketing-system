import { apiUrl } from "../api/api";

class TicketApprovalService {

    
    createTicketApproval(data) {
        return apiUrl.post("ticket-approval", data);
    }

  
    getAllApprovals() {
        return apiUrl.get("ticket-approval/getAll");
    }

    getApprovalProgress(ticketId) {
        return apiUrl.get(`ticket-approval/progress/${ticketId}`);
    }

}

export default new TicketApprovalService();
