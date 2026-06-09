# **Implementation Plan**

## **Platform: Hum-Awaaz Resident Mobile App**

### **Phase 1: Environment Setup & Routing**

* Initialize the Expo React Native project.  
* Configure NativeWind for styling.  
* Set up React Navigation (Bottom Tabs for Feed, Updates, Profile; Stack for Authentication).  
* Connect the Supabase JS client and verify Auth flows.

### **Phase 2: Core UI & Data Reading**

* Build the Community Feed UI, utilizing mock data for layouts.  
* Build the UC Info Profile Tab and Announcements Feed.  
* Connect UI to Supabase to read real-time data using onSnapshot or equivalent real-time listeners.

### **Phase 3: The Write Workflows**

* Build the "Report an Issue" screen.  
* Implement react-native-maps for visual pin dropping.  
* Implement Expo Camera / ImagePicker for complaint photo capture.  
* Write local image compression logic.  
* Connect the submit button to push data to Supabase (Storage \+ Database).  
* Implement the Upvote functionality.

### **Phase 4: Advanced Features (OCR & Geofencing)**

* Integrate Google ML Kit for React Native.  
* Build the Onboarding Verification Screen that utilizes the device camera to read text.  
* Connect to the backend PostGIS API endpoint to automatically assign the user's UC based on coordinates.