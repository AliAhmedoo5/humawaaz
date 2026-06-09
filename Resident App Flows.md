# **User Flows**

## **Platform: Hum-Awaaz Resident Mobile App**

### **1\. Onboarding & Geofencing Flow**

1. User downloads app and opens it.  
2. App requests Location Permissions.  
3. User is presented with a map and drops a pin on their residence.  
4. App queries backend; backend returns "You belong to UC-5 Safoora."  
5. User creates an account (Auth).

### **2\. Document Verification (OCR) Flow**

1. User navigates to the "Verify" tab to unlock posting rights.  
2. User selects "Scan Utility Bill" or "Scan CNIC".  
3. Camera opens; user snaps photo.  
4. App processes image locally using ML Kit.  
5. If extracted text matches the UC boundaries, user is marked as is\_verified \= true.

### **3\. Issue Reporting Flow**

1. Verified user taps the \[+\] floating action button.  
2. User is forced to take a photo or select an image of the issue.  
3. User enters a Title and Description.  
4. User optionally refines the GPS pin for the specific issue location.  
5. User taps "Submit". The issue instantly appears in the UC's Community Feed.

### **4\. Engagement Flow**

1. User scrolls the Community Feed.  
2. User taps "Upvote/Verify" on a neighbor's complaint to increase its priority.  
3. User opens a complaint to read official timeline updates (e.g., "Acknowledged by UC").