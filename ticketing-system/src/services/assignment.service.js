import { apiUrl } from "../api/api";

class AssignmentService {

    lockTicket(ticketId) {
        return apiUrl.patch(`assignment/lock/${ticketId}`);
    }


    resolveTicket(ticketId) {
        return apiUrl.patch(`assignment/resolve/${ticketId}`);
    }

}

export default new AssignmentService();
