import { apiUrl } from "../api/api";

class AssignmentService {

    // Lock a ticket (assign to officer)
    lockTicket(ticketId) {
        return apiUrl.patch(`assignment/lock/${ticketId}`);
    }

    // Resolve a ticket
    resolveTicket(ticketId) {
        return apiUrl.patch(`assignment/resolve/${ticketId}`);
    }

}

export default new AssignmentService();
