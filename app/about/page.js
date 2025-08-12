// app/about/page.js
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  Users, 
  Target, 
  Heart, 
  Award, 
  Zap,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Twitter
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AboutUsPage() {
  const router = useRouter();
  const [hoveredFounder, setHoveredFounder] = useState(null);

  const founders = [
    {
      id: 1,
      name: 'Blessan Corley A',
      role: 'CEO & Co-Founder',
      bio: 'Visionary leader in tech startups. Passionate about connecting people and solving real-world problems through technology.',
      expertise: 'Product Strategy, Business Development, Team Leadership',
      quote: 'Building bridges between skilled professionals and those who need their services.',
      image: '/founders/blessan.jpg',
      social: {
        linkedin: '#',
        twitter: '#',
        email: 'blessancorley@gmail.com'
      }
    },
    {
      id: 2,
      name: 'Vinoth Kumar M',
      role: 'CTO & Co-Founder',
      bio: 'Full-stack developer and system architect with expertise in scalable platforms. Loves building robust, user-friendly applications.',
      expertise: 'Software Architecture, DevOps, Mobile Development',
      quote: 'Technology should make life simpler, not more complicated.',
      image: '/founders/vinoth.jpg',
      social: {
        linkedin: '#',
        github: '#',
        email: 'blessancorley@gmail.com'
      }
    },
    {
      id: 3,
      name: 'Dinesh Madhavan M',
      role: 'Co-Founder',
      bio: 'Operations expert with deep understanding of local markets. Ensures quality service delivery and customer satisfaction.',
      expertise: 'Operations Management, Quality Assurance, Customer Success',
      quote: 'Excellence in execution is what transforms ideas into impact.',
      image: '/founders/dinesh.jpg',
      social: {
        linkedin: '#',
        twitter: '#',
        email: 'blessancorley@gmail.com'
      }
    }
  ];

  const values = [
    {
      icon: Heart,
      title: 'Customer First',
      description: 'Every decision we make puts our users at the center. Your success is our success.'
    },
    {
      icon: Award,
      title: 'Quality Excellence',
      description: 'We maintain the highest standards in service delivery and platform reliability.'
    },
    {
      icon: Users,
      title: 'Community Building',
      description: 'Fostering trust and collaboration between service providers and customers.'
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'Continuously improving our platform with cutting-edge technology and user feedback.'
    }
  ];

  const stats = [
    { label: 'Active Users', value: '50,000+' },
    { label: 'Jobs Completed', value: '100,000+' },
    { label: 'Cities Covered', value: '500+' },
    { label: 'Success Rate', value: '95%' }
  ];

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Header */}
      <header className="bg-fixly-card/80 backdrop-blur-md border-b border-fixly-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/')}
                className="btn-ghost mr-4 flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </button>
              <Wrench className="h-8 w-8 text-fixly-accent mr-2" />
              <span className="text-2xl font-bold text-fixly-text">Fixly</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-fixly-text mb-6">
              About <span className="text-fixly-accent">Fixly</span>
            </h1>
            <p className="text-xl text-fixly-text-light mb-8 max-w-3xl mx-auto">
              We're on a mission to connect skilled professionals with people who need their services, 
               creating opportunities and solving problems in communities across India.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-fixly-card">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-6">Our Story</h2>
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-fixly-text-light mb-6">
                Fixly was born from a simple observation: talented professionals were struggling to find work, 
                while people desperately needed reliable services. We saw families waiting weeks for a plumber, 
                skilled electricians without enough projects, and a disconnect that hurt both sides.
              </p>
              <p className="text-lg text-fixly-text-light mb-6">
                Founded in 2025 by three friends who experienced these challenges firsthand, Fixly started as 
                a hyperlocal solution in Coimbatore. Today, we're proud to serve over 500 cities across India, 
                connecting thousands of skilled professionals with customers who need their expertise.
              </p>
              <p className="text-lg text-fixly-text-light">
                Our platform isn't just about transactions—it's about building trust, creating opportunities, 
                and strengthening communities one successful job at a time.
                - Blessan Corley, Vinoth Kumar, and Dinesh Madhavan
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Founders Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">Meet Our Founders</h2>
            <p className="text-xl text-fixly-text-light max-w-2xl mx-auto">
              The passionate team behind Fixly's mission to transform how services are discovered and delivered.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {founders.map((founder, index) => (
              <motion.div
                key={founder.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative group"
                onMouseEnter={() => setHoveredFounder(founder.id)}
                onMouseLeave={() => setHoveredFounder(null)}
              >
                <div className={`relative overflow-hidden rounded-2xl transition-all duration-500 ease-in-out ${
                  hoveredFounder === founder.id 
                    ? 'transform scale-105 shadow-2xl' 
                    : 'shadow-lg hover:shadow-xl'
                }`}>
                  {/* Photo Container */}
                  <div className="relative h-80 overflow-hidden">
                    {/* Founder photo */}
                    <img 
                      src={founder.image} 
                      alt={founder.name}
                      className={`w-full h-full object-cover transition-all duration-500 ${
                        hoveredFounder === founder.id ? 'grayscale-0 scale-110' : 'grayscale scale-100'
                      }`}
                    />
                    
                    {/* Overlay that appears on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-500 ${
                      hoveredFounder === founder.id ? 'opacity-100' : 'opacity-0'
                    }`} />
                    
                    {/* Content that appears on hover */}
                    <div className={`absolute bottom-0 left-0 right-0 p-6 text-white transform transition-all duration-500 ${
                      hoveredFounder === founder.id 
                        ? 'translate-y-0 opacity-100' 
                        : 'translate-y-full opacity-0'
                    }`}>
                      <blockquote className="text-sm italic mb-3">
                        "{founder.quote}"
                      </blockquote>
                      <div className="text-xs opacity-90 mb-3">
                        <strong>Expertise:</strong> {founder.expertise}
                      </div>
                      <div className="flex space-x-3">
                        {founder.social.linkedin && (
                          <a href={founder.social.linkedin} className="hover:text-fixly-accent transition-colors">
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                        {founder.social.twitter && (
                          <a href={founder.social.twitter} className="hover:text-fixly-accent transition-colors">
                            <Twitter className="h-4 w-4" />
                          </a>
                        )}
                        {founder.social.github && (
                          <a href={founder.social.github} className="hover:text-fixly-accent transition-colors">
                            <Github className="h-4 w-4" />
                          </a>
                        )}
                        {founder.social.email && (
                          <a href={`mailto:${founder.social.email}`} className="hover:text-fixly-accent transition-colors">
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Founder Info (always visible) */}
                <div className="mt-6 text-center">
                  <h3 className="text-xl font-bold text-fixly-text mb-1">{founder.name}</h3>
                  <p className="text-fixly-accent font-medium mb-3">{founder.role}</p>
                  <p className="text-fixly-text-light text-sm leading-relaxed">{founder.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-fixly-card">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">Our Values</h2>
            <p className="text-xl text-fixly-text-light max-w-2xl mx-auto">
              The principles that guide everything we do at Fixly.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6 rounded-xl hover:bg-fixly-bg transition-colors duration-200"
              >
                <div className="w-16 h-16 bg-fixly-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-8 w-8 text-fixly-accent" />
                </div>
                <h3 className="text-xl font-semibold text-fixly-text mb-3">{value.title}</h3>
                <p className="text-fixly-text-light">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">Our Impact</h2>
            <p className="text-xl text-fixly-text-light max-w-2xl mx-auto">
              Numbers that tell the story of our growing community.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-fixly-accent mb-2">
                  {stat.value}
                </div>
                <div className="text-fixly-text-muted font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-fixly-card">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-6">Get in Touch</h2>
            <p className="text-xl text-fixly-text-light mb-8">
              Have questions or want to learn more about Fixly? We'd love to hear from you.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center p-6">
                <Mail className="h-8 w-8 text-fixly-accent mb-3" />
                <h3 className="font-semibold text-fixly-text mb-2">Email Us</h3>
                <a 
                  href="mailto:blessancorley@gmail.com" 
                  className="text-fixly-accent hover:text-fixly-accent-dark transition-colors"
                >
                  blessancorley@gmail.com
                </a>
              </div>

              <div className="flex flex-col items-center p-6">
                <Phone className="h-8 w-8 text-fixly-accent mb-3" />
                <h3 className="font-semibold text-fixly-text mb-2">Call Us</h3>
                <a 
                  href="tel:+919976768211" 
                  className="text-fixly-accent hover:text-fixly-accent-dark transition-colors"
                >
                  +91 9976768211
                </a>
              </div>

              <div className="flex flex-col items-center p-6">
                <MapPin className="h-8 w-8 text-fixly-accent mb-3" />
                <h3 className="font-semibold text-fixly-text mb-2">Visit Us</h3>
                <p className="text-fixly-text-muted text-center">
                  Coimbatore, Tamil Nadu<br />
                  India
                </p>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => router.push('/support')}
                className="btn-primary mr-4"
              >
                Contact Support
              </button>
              <button
                onClick={() => router.push('/')}
                className="btn-secondary"
              >
                Back to Home
              </button>
            </div>
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
// 'use client';

// import { useRouter } from 'next/navigation';
// import { motion } from 'framer-motion';
// import { 
//   ArrowLeft, 
//   Target, 
//   Eye, 
//   Heart, 
//   Users, 
//   CheckCircle, 
//   Star,
//   MapPin,
//   Wrench,
//   Shield,
//   Clock,
//   Award,
//   TrendingUp,
//   Globe
// } from 'lucide-react';

// export default function AboutPage() {
//   const router = useRouter();

//   const stats = [
//     { icon: Users, label: 'Active Users', value: '10,000+' },
//     { icon: CheckCircle, label: 'Jobs Completed', value: '50,000+' },
//     { icon: MapPin, label: 'Cities Covered', value: '500+' },
//     { icon: Star, label: 'Average Rating', value: '4.8/5' }
//   ];

//   const values = [
//     {
//       icon: Shield,
//       title: 'Trust & Safety',
//       description: 'We prioritize the safety and security of all our users through rigorous verification processes and secure payment systems.'
//     },
//     {
//       icon: Clock,
//       title: 'Reliability',
//       description: 'We connect you with dependable professionals who deliver quality work on time, every time.'
//     },
//     {
//       icon: Heart,
//       title: 'Community First',
//       description: 'We believe in building strong local communities by supporting both service seekers and providers.'
//     },
//     {
//       icon: Award,
//       title: 'Quality Excellence',
//       description: 'We maintain high standards through our rating system and continuous feedback from our community.'
//     }
//   ];

//   const features = [
//     {
//       icon: Users,
//       title: 'Verified Professionals',
//       description: 'All service providers go through background verification and skill assessment'
//     },
//     {
//       icon: Shield,
//       title: 'Secure Payments',
//       description: 'Safe and secure payment processing with dispute resolution support'
//     },
//     {
//       icon: Clock,
//       title: 'Quick Matching',
//       description: 'Get connected with qualified professionals in your area within minutes'
//     },
//     {
//       icon: Star,
//       title: 'Quality Assurance',
//       description: 'Rating and review system ensures consistent quality of service'
//     },
//     {
//       icon: Globe,
//       title: 'Hyperlocal Focus',
//       description: 'Find service providers in your immediate neighborhood for faster response'
//     },
//     {
//       icon: TrendingUp,
//       title: 'Growing Network',
//       description: 'Expanding across India with thousands of new professionals joining monthly'
//     }
//   ];

//   const timeline = [
//     {
//       year: '2024',
//       title: 'Foundation',
//       description: 'Fixly was founded with a vision to revolutionize the local service industry in India'
//     },
//     {
//       year: '2024',
//       title: 'Platform Launch',
//       description: 'Launched our beta platform in Tamil Nadu, connecting the first 100 service providers'
//     },
//     {
//       year: '2024',
//       title: 'Expansion',
//       description: 'Expanded to multiple cities with over 1,000 verified professionals on our platform'
//     },
//     {
//       year: '2025',
//       title: 'Growth',
//       description: 'Reached 10,000+ active users and completed 50,000+ successful service requests'
//     }
//   ];

//   return (
//     <div className="min-h-screen bg-fixly-bg">
//       {/* Header */}
//       <header className="bg-fixly-card/80 backdrop-blur-md border-b border-fixly-border">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center py-4">
//             <button
//               onClick={() => router.back()}
//               className="btn-ghost mr-4 flex items-center"
//             >
//               <ArrowLeft className="h-4 w-4 mr-2" />
//               Back
//             </button>
//             <h1 className="text-2xl font-bold text-fixly-text">About Fixly</h1>
//           </div>
//         </div>
//       </header>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//         {/* Hero Section */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="text-center mb-16"
//         >
//           <Wrench className="h-16 w-16 text-fixly-accent mx-auto mb-6" />
//           <h1 className="text-4xl font-bold text-fixly-text mb-4">
//             About Fixly
//           </h1>
//           <p className="text-xl text-fixly-text-light max-w-3xl mx-auto">
//             We're building India's most trusted hyperlocal marketplace where customers 
//             can easily find and hire skilled service professionals in their neighborhood.
//           </p>
//         </motion.div>

//         {/* Mission & Vision */}
//         <div className="grid lg:grid-cols-2 gap-12 mb-16">
//           <motion.div
//             initial={{ opacity: 0, x: -20 }}
//             whileInView={{ opacity: 1, x: 0 }}
//             viewport={{ once: true }}
//             className="card"
//           >
//             <Target className="h-12 w-12 text-fixly-accent mb-6" />
//             <h2 className="text-2xl font-bold text-fixly-text mb-4">Our Mission</h2>
//             <p className="text-fixly-text-light leading-relaxed">
//               To empower local communities by connecting skilled service providers with 
//               customers who need their expertise. We believe every neighborhood has talented 
//               professionals who can solve problems, fix issues, and improve lives. Our mission 
//               is to make these connections seamless, safe, and beneficial for everyone involved.
//             </p>
//           </motion.div>

//           <motion.div
//             initial={{ opacity: 0, x: 20 }}
//             whileInView={{ opacity: 1, x: 0 }}
//             viewport={{ once: true }}
//             className="card"
//           >
//             <Eye className="h-12 w-12 text-fixly-accent mb-6" />
//             <h2 className="text-2xl font-bold text-fixly-text mb-4">Our Vision</h2>
//             <p className="text-fixly-text-light leading-relaxed">
//               To become India's leading hyperlocal service marketplace where finding reliable 
//               professionals is as easy as ordering food online. We envision a future where 
//               every service need can be fulfilled quickly, safely, and affordably by verified 
//               professionals in your immediate vicinity.
//             </p>
//           </motion.div>
//         </div>

//         {/* Stats */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           viewport={{ once: true }}
//           className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
//         >
//           {stats.map((stat, index) => (
//             <div key={index} className="card text-center">
//               <stat.icon className="h-8 w-8 text-fixly-accent mx-auto mb-3" />
//               <div className="text-2xl font-bold text-fixly-text mb-1">{stat.value}</div>
//               <div className="text-fixly-text-muted text-sm">{stat.label}</div>
//             </div>
//           ))}
//         </motion.div>

//         {/* Our Story */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           viewport={{ once: true }}
//           className="card mb-16"
//         >
//           <h2 className="text-3xl font-bold text-fixly-text mb-6 text-center">Our Story</h2>
//           <div className="prose prose-lg max-w-4xl mx-auto text-fixly-text-light">
//             <p className="text-lg leading-relaxed mb-6">
//               Fixly was born from a simple observation: finding reliable local service providers 
//               shouldn't be a stressful experience. Too often, people struggle to find trustworthy 
//               professionals for their home and business needs, while skilled workers struggle to 
//               find consistent work opportunities.
//             </p>
//             <p className="text-lg leading-relaxed mb-6">
//               Founded in 2024 in Tamil Nadu, India, we started with a mission to bridge this gap 
//               using technology. Our platform brings together the convenience of modern apps with 
//               the trust and reliability that local communities deserve.
//             </p>
//             <p className="text-lg leading-relaxed">
//               Today, Fixly serves hundreds of cities across India, connecting thousands of 
//               customers with verified service professionals. From plumbing and electrical work 
//               to home cleaning and repairs, we're making local services more accessible, 
//               transparent, and reliable for everyone.
//             </p>
//           </div>
//         </motion.div>

//         {/* Our Values */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           viewport={{ once: true }}
//           className="mb-16"
//         >
//           <h2 className="text-3xl font-bold text-fixly-text mb-12 text-center">Our Values</h2>
//           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
//             {values.map((value, index) => (
//               <motion.div
//                 key={index}
//                 initial={{ opacity: 0, y: 20 }}
//                 whileInView={{ opacity: 1, y: 0 }}
//                 viewport={{ once: true }}
//                 transition={{ delay: index * 0.1 }}
//                 className="card text-center"
//               >
//                 <value.icon className="h-12 w-12 text-fixly-accent mx-auto mb-4" />
//                 <h3 className="text-lg font-semibold text-fixly-text mb-3">
//                   {value.title}
//                 </h3>
//                 <p className="text-fixly-text-light text-sm">
//                   {value.description}
//                 </p>
//               </motion.div>
//             ))}
//           </div>
//         </motion.div>

//         {/* What Makes Us Different */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           viewport={{ once: true }}
//           className="mb-16"
//         >
//           <h2 className="text-3xl font-bold text-fixly-text mb-12 text-center">
//             What Makes Us Different
//           </h2>
//           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
//             {features.map((feature, index) => (
//               <motion.div
//                 key={index}
//                 initial={{ opacity: 0, y: 20 }}
//                 whileInView={{ opacity: 1, y: 0 }}
//                 viewport={{ once: true }}
//                 transition={{ delay: index * 0.1 }}
//                 className="flex items-start p-6 rounded-xl hover:bg-fixly-card transition-colors"
//               >
//                 <feature.icon className="h-8 w-8 text-fixly-accent mr-4 mt-1" />
//                 <div>
//                   <h3 className="text-lg font-semibold text-fixly-text mb-2">
//                     {feature.title}
//                   </h3>
//                   <p className="text-fixly-text-light text-sm">
//                     {feature.description}
//                   </p>
//                 </div>
//               </motion.div>
//             ))}
//           </div>
//         </motion.div>

//         {/* Timeline */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           viewport={{ once: true }}
//           className="card mb-16"
//         >
//           <h2 className="text-3xl font-bold text-fixly-text mb-12 text-center">Our Journey</h2>
//           <div className="space-y-8">
//             {timeline.map((item, index) => (
//               <motion.div
//                 key={index}
//                 initial={{ opacity: 0, x: -20 }}
//                 whileInView={{ opacity: 1, x: 0 }}
//                 viewport={{ once: true }}
//                 transition={{ delay: index * 0.1 }}
//                 className="flex items-start"
//               >
//                 <div className="bg-fixly-accent text-fixly-text rounded-full w-16 h-16 flex items-center justify-center font-bold text-sm mr-6 flex-shrink-0">
//                   {item.year}
//                 </div>
//                 <div>
//                   <h3 className="text-xl font-semibold text-fixly-text mb-2">
//                     {item.title}
//                   </h3>
//                   <p className="text-fixly-text-light">
//                     {item.description}
//                   </p>
//                 </div>
//               </motion.div>
//             ))}
//           </div>
//         </motion.div>

//         {/* Contact CTA */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           viewport={{ once: true }}
//           className="card text-center"
//         >
//           <h2 className="text-2xl font-bold text-fixly-text mb-4">
//             Want to Learn More?
//           </h2>
//           <p className="text-fixly-text-light mb-6 max-w-2xl mx-auto">
//             Have questions about our platform, want to partner with us, or interested in 
//             joining our team? We'd love to hear from you.
//           </p>
//           <div className="flex flex-col md:flex-row gap-4 justify-center">
//             <button
//               onClick={() => router.push('/contact')}
//               className="btn-primary"
//             >
//               Contact Us
//             </button>
//             <button
//               onClick={() => router.push('/auth/signup')}
//               className="btn-secondary"
//             >
//               Join Fixly Today
//             </button>
//           </div>
//         </motion.div>
//       </div>
//     </div>
//   );
// }