'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  Zap, 
  Droplets, 
  Hammer, 
  Car, 
  Brush, 
  Laptop, 
  TreePine, 
  Home, 
  ArrowLeft,
  Search,
  MapPin,
  Clock,
  Star
} from 'lucide-react';

export default function ServicesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const serviceCategories = [
    {
      id: 'electrical',
      name: 'Electrical',
      icon: Zap,
      description: 'Wiring, outlets, fixtures, and electrical repairs',
      services: ['Outlet Installation', 'Light Fixture Repair', 'Electrical Wiring', 'Circuit Breaker Repair', 'Ceiling Fan Installation'],
      color: 'bg-yellow-500'
    },
    {
      id: 'plumbing',
      name: 'Plumbing',
      icon: Droplets,
      description: 'Pipes, drains, faucets, and water systems',
      services: ['Leak Repair', 'Drain Cleaning', 'Faucet Installation', 'Toilet Repair', 'Water Heater Service'],
      color: 'bg-blue-500'
    },
    {
      id: 'handyman',
      name: 'Handyman',
      icon: Hammer,
      description: 'General repairs, maintenance, and installations',
      services: ['Furniture Assembly', 'Wall Mounting', 'Door Repair', 'Window Fixing', 'General Maintenance'],
      color: 'bg-orange-500'
    },
    {
      id: 'automotive',
      name: 'Automotive',
      icon: Car,
      description: 'Car repairs, maintenance, and diagnostics',
      services: ['Oil Change', 'Brake Repair', 'Battery Replacement', 'Tire Service', 'Engine Diagnostics'],
      color: 'bg-red-500'
    },
    {
      id: 'painting',
      name: 'Painting',
      icon: Brush,
      description: 'Interior and exterior painting services',
      services: ['Interior Painting', 'Exterior Painting', 'Wall Prep', 'Touch-up Repairs', 'Color Consultation'],
      color: 'bg-fixly-primary'
    },
    {
      id: 'technology',
      name: 'Technology',
      icon: Laptop,
      description: 'Computer repair, setup, and tech support',
      services: ['Computer Repair', 'WiFi Setup', 'Smart Home Installation', 'Data Recovery', 'Software Installation'],
      color: 'bg-green-500'
    },
    {
      id: 'landscaping',
      name: 'Landscaping',
      icon: TreePine,
      description: 'Garden, lawn, and outdoor maintenance',
      services: ['Lawn Mowing', 'Garden Design', 'Tree Trimming', 'Irrigation Systems', 'Landscape Maintenance'],
      color: 'bg-emerald-500'
    },
    {
      id: 'home-improvement',
      name: 'Home Improvement',
      icon: Home,
      description: 'Renovations, upgrades, and home projects',
      services: ['Kitchen Renovation', 'Bathroom Remodel', 'Flooring Installation', 'Cabinet Installation', 'Tile Work'],
      color: 'bg-indigo-500'
    }
  ];

  const filteredCategories = serviceCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.services.some(service => service.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePostJob = () => {
    sessionStorage.setItem('selectedRole', 'hirer');
    router.push('/auth/signup?role=hirer');
  };

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Header */}
      <header className="bg-fixly-card/80 backdrop-blur-md border-b border-fixly-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/')}
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <Wrench className="h-8 w-8 text-fixly-accent mr-2" />
                <span className="text-2xl font-bold text-fixly-text">Fixly</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/auth/signin')}
                className="btn-ghost"
              >
                Sign In
              </button>
              <button 
                onClick={handlePostJob}
                className="btn-primary"
              >
                Post a Job
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-fixly-text mb-6"
          >
            Find Services
            <span className="block text-fixly-accent">Near You</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-fixly-text-light mb-8"
          >
            Connect with verified professionals for all your service needs
          </motion.p>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative max-w-md mx-auto mb-8"
          >
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fixly-text-muted h-5 w-5" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-fixly-border bg-fixly-card focus:outline-none focus:ring-2 focus:ring-fixly-accent focus:border-transparent"
            />
          </motion.div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCategories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-fixly-card rounded-xl p-6 hover:shadow-fixly-lg transition-all duration-300 hover-lift"
              >
                <div className={`${category.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <category.icon className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-fixly-text mb-2">
                  {category.name}
                </h3>
                
                <p className="text-fixly-text-light mb-4">
                  {category.description}
                </p>
                
                <div className="space-y-2 mb-6">
                  {category.services.slice(0, 3).map((service, serviceIndex) => (
                    <div key={serviceIndex} className="flex items-center text-sm text-fixly-text-muted">
                      <div className="w-1.5 h-1.5 bg-fixly-accent rounded-full mr-2" />
                      {service}
                    </div>
                  ))}
                  {category.services.length > 3 && (
                    <div className="text-sm text-fixly-accent font-medium">
                      +{category.services.length - 3} more services
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handlePostJob}
                  className="w-full btn-primary text-sm"
                >
                  Find {category.name} Experts
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Our Services */}
      <section className="py-20 bg-fixly-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Why Choose Fixly Services?
            </h2>
            <p className="text-xl text-fixly-text-light max-w-2xl mx-auto">
              Quality service providers you can trust
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="bg-fixly-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-fixly-accent" />
              </div>
              <h3 className="text-xl font-semibold text-fixly-text mb-2">
                Verified Professionals
              </h3>
              <p className="text-fixly-text-light">
                All service providers undergo background checks and skill verification
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="bg-fixly-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-fixly-accent" />
              </div>
              <h3 className="text-xl font-semibold text-fixly-text mb-2">
                Quick Response
              </h3>
              <p className="text-fixly-text-light">
                Get responses from qualified professionals within hours
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="bg-fixly-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-fixly-accent" />
              </div>
              <h3 className="text-xl font-semibold text-fixly-text mb-2">
                Local Experts
              </h3>
              <p className="text-fixly-text-light">
                Connect with skilled professionals in your local area
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-fixly-card rounded-2xl p-12 shadow-fixly-lg"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-fixly-text-light mb-8">
              Post your job and connect with qualified service professionals today
            </p>
            <button 
              onClick={handlePostJob}
              className="btn-primary text-lg px-8 py-4 hover-lift"
            >
              Post a Job Now
            </button>
          </motion.div>
        </div>
      </section>

      {/* Back to Home */}
      <div className="fixed bottom-6 left-6">
        <button
          onClick={() => router.push('/')}
          className="bg-fixly-card hover:bg-fixly-card/80 border border-fixly-border rounded-full p-3 shadow-fixly transition-all duration-200 hover-lift"
        >
          <ArrowLeft className="h-5 w-5 text-fixly-text" />
        </button>
      </div>
    </div>
  );
}