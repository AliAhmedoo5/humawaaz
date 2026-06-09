# **Technical Requirements Document (TRD)**

## **Platform: Hum-Awaaz Resident Mobile App**

### **1\. Technology Stack**

* **Framework:** React Native.  
* **Development Build Tool:** Expo (optimized for rapid "vibecoding" and cross-platform deployment).  
* **Styling:** NativeWind (Tailwind CSS for React Native) for rapid UI iteration.  
* **Mapping:** react-native-maps for geofencing UI and pin-dropping.  
* **OCR Engine:** Google ML Kit (React Native wrapper) for on-device text extraction.  
* **Backend Client:** @supabase/supabase-js.  
* **State Management:** React Context API or Zustand.

### **2\. Database Integration Requirements (Supabase)**

* **Authentication:** Supabase Auth (Email/Password or Phone OTP).  
* **Geospatial Queries:** The app must capture user Lat/Long and send it to a Supabase Edge Function or RPC that utilizes **PostGIS** (ST\_Contains) to return the corresponding uc\_id.  
* **Row Level Security (RLS):**  
  * Residents can only SELECT complaints where complaints.uc\_id \== user.uc\_id.  
  * Residents can only INSERT into the complaints table if their profiles.is\_verified \== true.  
* **Image Handling:** The app must compress images locally using a canvas or image-manipulation library before uploading to **Supabase Storage** to respect payload limits and optimize bandwidth.

### **3\. Key Technical Challenges**

* **On-Device OCR Reliability:** Ensuring the OCR library successfully extracts text from crumpled or poorly lit K-Electric bills without sending image data to an external API.  
* **Offline State:** App should gracefully handle network disconnections (common in Karachi) and cache data using AsyncStorage.