import { apiUrl } from "../api/api";

class TicketService {

    // Create a new ticket
    createTicket(ticketData) {
        return apiUrl.post("ticket", ticketData);
    }

    // Get all tickets
    getAllTickets() {
        return apiUrl.get("ticket/getall");
    }

    // Get a ticket by ID
    getTicketById(id) {
        return apiUrl.get(`ticket/getById/${id}`);
    }

    // Close a ticket by ID
    closeTicket(id) {
        return apiUrl.patch(`ticket/close/${id}`);
    }

}

export default new TicketService();
