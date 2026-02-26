import { apiUrl } from "../api/api";

class AssignmentService {

    lockTicket(ticketId) {
        return apiUrl.patch(`assignment/lock/${ticketId}`);
    }


    resolveTicket(ticketId) {
        return apiUrl.patch(`assignment/resolve/${ticketId}`);
    }

    rejectTicket(ticketId, reason) {
        return apiUrl.patch(`assignment/reject/${ticketId}`, { reason });
    }

    markAsNotResolved(ticketId, reason) {
        return apiUrl.patch(`assignment/not-resolved/${ticketId}`, { reason });
    }

    reassignTicket(ticketId, newAssignedTo) {
        return apiUrl.patch(`assignment/reassign/${ticketId}`, { new_assigned_to: newAssignedTo });
    }

}

export default new AssignmentService();
