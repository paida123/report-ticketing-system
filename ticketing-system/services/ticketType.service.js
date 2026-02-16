import { apiUrl } from "../api/api";

class TicketTypeService {

    // Create a new ticket type
    createTicketType(data) {
        return apiUrl.post("ticket-type", data);
    }

    // Get all ticket types
    getAllTicketTypes() {
        return apiUrl.get("ticket-type/getAll");
    }

    // Delete a ticket type by ID
    deleteTicketType(id) {
        return apiUrl.delete(`ticket-type/delete/${id}`);
    }

    // Update a ticket type by ID
    updateTicketType(id, data) {
        return apiUrl.patch(`ticket-type/edit/${id}`, data);
    }

}

export default new TicketTypeService();
