# **Implementation Plan**

## **Platform: Hum-Awaaz Official Web Portal**

### **Phase 1: Foundation & Layout**

* Initialize the React application (Vite or Next.js).  
* Configure Tailwind CSS and install Shadcn UI components.  
* Build the static sidebar layout and secure routing structure (Login vs. Dashboard views).  
* Connect the Supabase JS client.

### **Phase 2: Executive Dashboard**

* Fetch aggregate data from Supabase (Total Complaints, Pending, Resolved).  
* Build the metric cards.  
* Integrate Recharts to display historical resolution data visually.  
* Build the "Urgent Queue" that queries unresolved complaints ordered by upvote\_count.

### **Phase 3: Ticket Management System**

* Build the detailed view modal/page for individual complaints.  
* Implement the form logic to update a complaint's status and department.  
* Implement the complaint\_updates timeline functionality (inserting new remarks).  
* Integrate browser-based file picking and Supabase Storage upload logic for "Success Photos".

### **Phase 4: Office Management & Broadcasting**

* Build the "Notice Board" management screen to draft and publish announcements to the Supabase database.  
* Build the "Office Settings" screen allowing officials to update contact details and toggle the UC Open/Closed boolean state.