const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const shapefile = require('shapefile');

// Supabase Configuration
const SUPABASE_URL = 'https://hbuzjssuzwdaanrccrsg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhidXpqc3N1endkYWFucmNjcnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzM0NzksImV4cCI6MjA5NjUwOTQ3OX0.PhI7qTDaiOfLSy8S9OjJcQnwzVCJAH6k8-8xbZAZH60';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const shpPath = path.join(__dirname, '..', 'data', 'Union_Council.shp');
const dbfPath = path.join(__dirname, '..', 'data', 'Union_Council.dbf');

async function seedData() {
  console.log('Reading Shapefile...');
  try {
    const geojson = await shapefile.read(shpPath, dbfPath, { encoding: 'utf-8' });
    const features = geojson.features;
    console.log(`Found ${features.length} features. Filtering for Karachi...`);

    // In Pakistan, Karachi is often a Division or its districts are explicitly named (e.g., 'Karachi South', 'Karachi East', etc.)
    // We will attempt to filter or just insert all of them. Since the prompt asks for Karachi UCs, let's see properties.
    // If we don't know the exact property names, let's log the first feature's properties
    if (features.length > 0) {
      console.log('Sample properties:', features[0].properties);
    }

    let insertedCount = 0;
    
    for (const feature of features) {
      const props = feature.properties;
      const geom = feature.geometry;

      // We need to map the shapefile properties to our columns.
      // Usually they are named like PROVINCE, DISTRICT, TEHSIL, UC_NAME, UC_ID
      // Let's make a generic mapping based on common naming in Pakistan boundary shapefiles.
      const district = props.DISTRICT || props.District || props.district || '';
      
      // If we strictly want Karachi, we can filter by district name containing 'Karachi' or 'Korangi' or 'Malir' etc.
      // For safety, let's just insert all or if district exists, filter by Karachi districts.
      const isKarachi = district.toLowerCase().includes('karachi') || 
                        district.toLowerCase().includes('korangi') || 
                        district.toLowerCase().includes('malir') ||
                        district.toLowerCase().includes('kemari');
      
      if (!isKarachi && district !== '') {
        // Skip non-Karachi if district is explicitly set and not Karachi
        continue;
      }

      const ucName = props.UC_NAME || props.UC || props.Union_Coun || props.name || 'Unknown UC';
      const tehsil = props.TEHSIL || props.Tehsil || props.tehsil || '';
      const ucId = props.UC_ID || props.OBJECTID || props.id || Math.random().toString(36).substring(7);

      const { data, error } = await supabase.rpc('insert_uc', {
        p_uc_id: String(ucId),
        p_name: String(ucName),
        p_tehsil: String(tehsil),
        p_district: String(district),
        p_geom: geom
      });

      if (error) {
        console.error(`Error inserting UC ${ucName}:`, error.message);
      } else {
        insertedCount++;
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} Union Councils.`);
  } catch (err) {
    console.error('Error:', err);
  }
}

seedData();
