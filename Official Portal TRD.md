# **Technical Requirements Document (TRD)**

## **Platform: Hum-Awaaz Official Web Portal**

### **1\. Technology Stack**

* **Framework:** React.js (via Vite) or Next.js.  
* **Styling:** Tailwind CSS.  
* **UI Components:** Shadcn UI (for highly professional, accessible dashboard components like tables, modals, and metric cards).  
* **Data Visualization:** Recharts (for rendering resolution rate and complaint frequency graphs).  
* **Backend Client:** @supabase/supabase-js.

### **2\. Database Integration Requirements (Supabase)**

* **Authentication:** Secure login using credentials specifically provisioned by the Hum-Awaaz admin team (preventing public sign-ups for official roles).  
* **Role-Based Access Control:**  
  * The portal must verify the user has role \== 'official' in the profiles table before rendering the dashboard.  
  * Officials can only perform UPDATE operations on complaints matching their specific uc\_id.  
* **Relational Data Fetching:** The portal needs to fetch complaints and join them with the complaint\_updates table to render the full timeline history of an issue.

### **3\. Key Technical Challenges**

* **Real-Time Subscriptions:** Utilizing Supabase Realtime to update the dashboard immediately when a resident posts a new complaint, without requiring a page refresh.  
* **Image Upload Optimization:** Implementing browser-side image compression before uploading "Success Photos" to Supabase Storage to ensure snappy performance on slow office internet connections.