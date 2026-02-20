import { apiUrl } from "../api/api";

class TicketApprovalService {

    
    createTicketApproval(data) {
        return apiUrl.post("ticket-approval", data);
    }

  
    getAllApprovals() {
        return apiUrl.get("ticket-approval/getAll");
    }

}

export default new TicketApprovalService();
