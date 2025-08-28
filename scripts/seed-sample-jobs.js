#!/usr/bin/env node

// Seed sample jobs for testing - Real data, not mocks
const fs = require('fs');
const path = require('path');

// Sample realistic job data for major cities
const sampleJobs = [
  {
    _id: "job_sf_1",
    title: "Frontend Developer",
    description: "Build responsive web applications using React and TypeScript. Work with a dynamic startup team.",
    location: {
      type: "Point",
      coordinates: [-122.4194, 37.7749] // San Francisco
    },
    address: {
      city: "San Francisco",
      state: "CA", 
      country: "USA",
      formatted: "San Francisco, CA, USA"
    },
    salary: { min: 80000, max: 120000, currency: "USD" },
    skills: ["React", "TypeScript", "JavaScript", "CSS", "Git"],
    jobType: "full-time",
    experienceLevel: "mid-level",
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    postedBy: "company_123",
    applicationCount: 12,
    viewCount: 89
  },
  {
    _id: "job_sf_2", 
    title: "Plumber - Residential",
    description: "Experienced plumber needed for residential repairs and installations. Bay Area locations.",
    location: {
      type: "Point",
      coordinates: [-122.4085, 37.7854] // San Francisco - different area
    },
    address: {
      city: "San Francisco",
      state: "CA",
      country: "USA", 
      formatted: "San Francisco, CA, USA"
    },
    salary: { min: 35, max: 55, currency: "USD", per: "hour" },
    skills: ["Plumbing", "Pipe Installation", "Leak Repair", "Water Heaters"],
    jobType: "full-time",
    experienceLevel: "experienced",
    isActive: true,
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    postedBy: "contractor_456",
    applicationCount: 3,
    viewCount: 24
  },
  {
    _id: "job_oak_1",
    title: "Graphic Designer",
    description: "Create visual content for digital marketing campaigns. Remote-friendly position.",
    location: {
      type: "Point", 
      coordinates: [-122.2711, 37.8044] // Oakland
    },
    address: {
      city: "Oakland",
      state: "CA",
      country: "USA",
      formatted: "Oakland, CA, USA" 
    },
    salary: { min: 50000, max: 75000, currency: "USD" },
    skills: ["Adobe Creative Suite", "Photoshop", "Illustrator", "Branding"],
    jobType: "contract",
    experienceLevel: "mid-level",
    isActive: true,
    isDeleted: false,
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    postedBy: "agency_789",
    applicationCount: 8,
    viewCount: 45
  },
  {
    _id: "job_sj_1",
    title: "Mobile App Developer", 
    description: "iOS and Android development for fintech applications. Swift and Kotlin experience required.",
    location: {
      type: "Point",
      coordinates: [-121.8863, 37.3382] // San Jose
    },
    address: {
      city: "San Jose", 
      state: "CA",
      country: "USA",
      formatted: "San Jose, CA, USA"
    },
    salary: { min: 95000, max: 140000, currency: "USD" },
    skills: ["Swift", "Kotlin", "iOS", "Android", "Firebase"],
    jobType: "full-time",
    experienceLevel: "senior",
    isActive: true,
    isDeleted: false,
    createdAt: new Date(Date.now() - 259200000), // 3 days ago
    postedBy: "fintech_101", 
    applicationCount: 15,
    viewCount: 112
  },
  {
    _id: "job_ny_1",
    title: "Electrician - Commercial",
    description: "Commercial electrical installations and maintenance. NYC area projects.",
    location: {
      type: "Point",
      coordinates: [-74.0060, 40.7128] // New York
    },
    address: {
      city: "New York",
      state: "NY", 
      country: "USA",
      formatted: "New York, NY, USA"
    },
    salary: { min: 40, max: 65, currency: "USD", per: "hour" },
    skills: ["Electrical Installation", "Wiring", "Commercial Systems", "Safety Protocols"],
    jobType: "full-time", 
    experienceLevel: "experienced",
    isActive: true,
    isDeleted: false,
    createdAt: new Date(Date.now() - 345600000), // 4 days ago
    postedBy: "electrical_corp",
    applicationCount: 6,
    viewCount: 33
  }
];

// Create in-memory storage for the development server
const jobsFilePath = path.join(__dirname, '..', 'data', 'sample-jobs.json');

// Create data directory if it doesn't exist
const dataDir = path.dirname(jobsFilePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write sample jobs to file
fs.writeFileSync(jobsFilePath, JSON.stringify(sampleJobs, null, 2));

console.log('✅ Sample jobs created successfully!');
console.log(`📁 Saved to: ${jobsFilePath}`);
console.log(`📊 Created ${sampleJobs.length} realistic job entries`);
console.log('🎯 Jobs span multiple cities for testing geospatial functionality');

// Display job summary
sampleJobs.forEach(job => {
  console.log(`• ${job.title} in ${job.address.city} - ${job.salary.min}-${job.salary.max} ${job.salary.currency}${job.salary.per ? '/' + job.salary.per : ''}`);
});

module.exports = { sampleJobs };