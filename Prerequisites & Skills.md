# **Prerequisites & Required Stack Skills**

## **Project: Hum-Awaaz**

### **1\. Developer Environment Setup**

To build and execute this project, the local environment must have the following installed:

* **Node.js:** v18+ (LTS recommended)  
* **Package Manager:** npm, yarn, or bun  
* **Mobile Simulator:** iOS Simulator (Xcode) and Android Emulator (Android Studio), or a physical device with the **Expo Go** app installed.  
* **MCP Servers:** Active instances of Supabase MCP and Stitch MCP running in the AI IDE environment.  
* **Data Assets:** A local data folder containing the unzipped Karachi Union Committee data (boundary coordinates, official names, etc.) to be used for database seeding.

### **2\. AI Skillset Parameters**

The AI is instructed to draw upon expert-level knowledge in the following domains:

#### **A. Resident App Stack (Mobile)**

* **Framework:** React Native & Expo (EAS Build workflows).  
* **Styling:** NativeWind (v4+ syntax preferred).  
* **Geospatial:** react-native-maps for rendering polygons and dropping pins.  
* **Device APIs:** expo-camera or expo-image-picker for capturing civic issue photos and "Success Photos". Google ML Kit (React Native wrapper) for on-device OCR document scanning.  
* **Navigation:** React Navigation (Bottom Tabs, Stack).

#### **B. Official Portal Stack (Web)**

* **Framework:** React.js (via Vite) or Next.js (App Router).  
* **UI/UX:** Tailwind CSS, Radix UI primitives, Shadcn UI components. (Orchestrated via Stitch MCP).  
* **Data Visualization:** Recharts for rendering the UC "Resolution Rate" and "Public Trust Score" dashboards.

#### **C. Backend Stack (Supabase / Postgres)**

* **Database Engine:** PostgreSQL.  
* **Spatial Extension:** **PostGIS**. The AI must understand how to import GeoJSON/KML boundary data (from the provided data folder) and write raw SQL to compare Geometry/Point data against Geometry/Polygon data.  
* **Realtime:** Supabase Realtime (WebSockets) for updating the community feed the moment a new complaint is submitted or acknowledged.  
* **Storage:** Supabase Storage APIs, including generating signed URLs and handling browser-side vs. mobile-side file compression.

#### **D. Specialized Domain Knowledge**

* **Karachi Civic Structure:** Understanding the concept of UCs (Union Committees) and TMCs (Town Municipal Corporations) to effectively structure relational data.  
* **Data Privacy:** Implementing OCR text-extraction locally so user CNIC/Utility Bill images are explicitly NOT uploaded to the cloud database.