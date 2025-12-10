
import React, { useEffect } from 'react';
import GeneratorPage from './GeneratorPage'; // This will now be handled by DashboardPage

// SVG Icons remain the same...
const WhatsAppIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.267.655 4.398 1.908 6.161l.11.168-1.217 4.459 4.569-1.196.163.099z" /></svg>;
const FacebookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v2.385z" /></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 md:h-16 md:w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 md:h-16 md:w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 md:h-16 md:w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.97 5.97 0 0112 13a5.97 5.97 0 013 1.803M15 21a9 9 0 00-9-8.643" /></svg>;
// Fix: Updated icon components to accept a className prop to resolve type errors.
const StarIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${className || ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
// Fix: Updated icon components to accept a className prop to resolve type errors.
const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${className || ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.955a12.02 12.02 0 009 2.825a12.02 12.02 0 009-2.825a12.02 12.02 0 00-2.382-8.986" /></svg>;
// Fix: Updated icon components to accept a className prop to resolve type errors.
const PinIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${className || ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const useScrollAnimation = () => {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                    entry.target.classList.remove('opacity-0', 'translate-y-[20px]');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.animate-fade-in-scroll').forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);
};

const HeroSection: React.FC<{ onAuthRequest: () => void }> = ({ onAuthRequest }) => (
    <section className="relative min-h-screen sm:min-h-[80vh] flex items-center justify-center text-center overflow-hidden py-16 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1226] via-transparent to-[#0B1226] z-10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-[#FF38B1]/10 rounded-full blur-3xl animate-pulse"></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-[#00AFED]/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>

        <div className="container mx-auto px-6 relative z-20">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight animate-fade-in" style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.3)'}}>
                ON PROGRESSE ENSEMBLE,
                <br/>
                KILOMÈTRE APRÈS KILOMÈTRE
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                Performance • Convivialité • Tous niveaux
            </p>
            <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <a href="https://chat.whatsapp.com/K6s9q2yMEYwL5Vk349Zx4J" target="_blank" rel="noopener noreferrer" className="px-6 py-3 text-lg font-semibold text-white rounded-full bg-green-500/80 backdrop-blur-sm border border-white/20 transition-all duration-300 ease-in-out hover:bg-green-500 flex items-center gap-2">
                    <WhatsAppIcon /> Rejoindre WhatsApp
                </a>
                <button onClick={onAuthRequest} className="px-6 py-3 text-lg font-semibold text-black rounded-full bg-[#FF38B1] transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#FF38B1]/50 glow-shadow-pink-hover">
                    Programme Perso
                </button>
                 <a href="https://www.facebook.com/groups/481948624640982/" target="_blank" rel="noopener noreferrer" className="px-6 py-3 text-lg font-semibold text-white rounded-full bg-blue-600/80 backdrop-blur-sm border border-white/20 transition-all duration-300 ease-in-out hover:bg-blue-600 flex items-center gap-2">
                    <FacebookIcon /> Facebook
                </a>
            </div>
             <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-8 text-white/80 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="border-t border-white/20 pt-3">
                    <p className="text-3xl md:text-4xl font-bold text-white">400+</p>
                    <p className="text-sm md:text-base">Coureurs</p>
                </div>
                 <div className="border-t border-white/20 pt-3">
                    <p className="text-3xl md:text-4xl font-bold text-white">2x / semaine</p>
                    <p className="text-sm md:text-base">Sorties Club</p>
                </div>
                 <div className="border-t border-white/20 pt-3">
                    <p className="text-3xl md:text-4xl font-bold text-white">100%</p>
                    <p className="text-sm md:text-base">Progression</p>
                </div>
            </div>
        </div>
    </section>
);

const ClubInfoSection = () => (
    <section className="py-20 md:py-24 bg-[#0B1226]">
        <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 md:gap-12 items-center">
                <div className="animate-fade-in-scroll flex flex-col justify-center gap-12">
                    <div>
                        <h2 className="text-5xl md:text-6xl font-bold text-white leading-tight">2 frères, 1 même objectif. <span className="text-[#00AFED]">Partager leur passion.</span></h2>
                        <p className="mt-6 text-xl md:text-2xl text-gray-300 leading-relaxed">
                            Créé en septembre 2024, le Saint-Avertin Run Club rassemble plus de 400 passionnés autour d’un état d’esprit unique : progresser ensemble dans la bonne humeur, quel que soit le niveau. Chaque séance est un moment de partage, d’entraide et de dépassement collectif.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
                        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 glow-shadow-pink">
                            <h3 className="text-2xl font-bold text-[#FF38B1]">Mercredi 19h00</h3>
                            <p className="text-lg mt-1">Stade des Grands Champs</p>
                            <p className="mt-2 text-base text-gray-400">Fractionné / Piste / VMA / Séances côtes</p>
                        </div>
                        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 glow-shadow-pink">
                            <h3 className="text-2xl font-bold text-[#FF38B1]">Dimanche 10h00</h3>
                            <p className="text-lg mt-1">Bois des Hâtes</p>
                            <p className="mt-2 text-base text-gray-400">~10 km à 6:00/km, sortie conviviale</p>
                        </div>
                    </div>
                </div>
                <div className="animate-fade-in-scroll" style={{ transitionDelay: '0.2s' }}>
                    <div className="relative h-full">
                        <img src="https://i.postimg.cc/13tmGfDk/IMG-9732-2.jpg" alt="Fondateurs du club" className="rounded-2xl shadow-2xl w-full h-full object-cover" />
                         <div className="absolute -bottom-4 -right-4 bg-[#183C89] px-4 py-2 rounded-lg border border-white/10 text-sm font-semibold">Les Fondateurs</div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);


const GallerySection = () => {
    const images = [
        { src: 'https://i.postimg.cc/qvzrtWTz/Capture-d-e-cran-2025-11-12-a-10-59-08.png', alt: 'Entraînement piste de nuit' },
        { src: 'https://i.postimg.cc/HLXfXgPd/Capture-d-e-cran-2025-11-12-a-10-59-42.png', alt: 'Bla-bla run au Bois des Hâtes' },
        { src: 'https://i.postimg.cc/8zBR6XmS/Image-12-11-2025-a-11-03.jpg', alt: 'Préparation 10 & 20 km de Tours' },
        { src: 'https://i.postimg.cc/cLstRZcV/IMG-2229.avif', alt: 'Soirée des 1 ans' },
        { src: 'https://i.postimg.cc/1Xm1WWYp/IMG-6177.jpg', alt: 'Infinity trail' },
        { src: 'https://i.postimg.cc/BnMpDm2w/DJI-0069.avif', alt: 'Soirée remise des maillots' },
    ];
    return (
    <section className="py-16">
        <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold text-white animate-fade-in-scroll">Nos Moments Forts</h2>
                <p className="mt-4 text-base sm:text-lg text-gray-300 animate-fade-in-scroll">Découvrez l’ambiance unique de nos sorties et entraînements. Une communauté passionnée qui progresse ensemble.</p>
            </div>
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in-scroll">
                {images.map((img, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl aspect-square" style={{ transitionDelay: `${i * 100}ms`}}>
                        <img src={img.src} alt={img.alt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                        <p className="absolute bottom-4 left-4 text-base font-semibold text-white">{img.alt}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
)};

const PartnerSection = () => (
    <section className="py-16 bg-black/20">
        <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                 <div className="animate-fade-in-scroll">
                    <h2 className="text-base font-bold uppercase tracking-widest text-[#00AFED]">Partenaire Officiel</h2>
                    <p className="text-3xl sm:text-4xl font-bold text-white mt-2">LaFORÊT Saint-Avertin</p>
                    <p className="mt-4 text-base sm:text-lg text-gray-300">Votre partenaire immobilier de confiance pour tous vos projets.</p>
                     <div className="mt-6 space-y-4">
                        <div className="flex items-center gap-4"><div className="bg-[#00AFED]/10 p-3 rounded-full"><StarIcon className="text-[#00AFED]" /></div><span className="text-base">Estimation précise : gratuite & sans engagement.</span></div>
                        <div className="flex items-center gap-4"><div className="bg-[#00AFED]/10 p-3 rounded-full"><ShieldIcon className="text-[#00AFED]" /></div><span className="text-base">Accompagnement sécurisé : suivi personnalisé.</span></div>
                        <div className="flex items-center gap-4"><div className="bg-[#00AFED]/10 p-3 rounded-full"><PinIcon className="text-[#00AFED]" /></div><span className="text-base">Expertise locale : connaissance parfaite du secteur.</span></div>
                    </div>
                </div>
                 <div className="animate-fade-in-scroll" style={{ transitionDelay: '0.2s' }}>
                    <div className="bg-gradient-to-br from-[#00AFED]/20 to-transparent border border-white/10 rounded-2xl p-8 text-center">
                        <p className="text-xl font-semibold">Prêt à connaître la valeur de votre bien ?</p>
                        <div className="mt-4 flex flex-col sm:flex-row justify-center gap-4">
                            <a href="https://www.laforet.com/agence-immobiliere/saint-avertin/estimer" target="_blank" rel="noopener noreferrer" className="px-6 py-3 text-base font-semibold text-white rounded-full bg-[#00AFED] transition-all duration-300 hover:scale-105 glow-shadow-hover">🏡 Estimer mon bien</a>
                            <a href="https://www.laforet.com/agence-immobiliere/saint-avertin" target="_blank" rel="noopener noreferrer" className="px-6 py-3 text-base font-semibold text-white rounded-full bg-white/10 border border-white/20 transition-colors hover:bg-white/20">🏢 Découvrir l’agence</a>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    </section>
);

const ContactSection = () => (
    <section id="joindre" className="py-16 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-[#FF38B1]/10 rounded-full blur-3xl"></div>
        <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold text-white animate-fade-in-scroll">Rejoindre le Club</h2>
                <p className="mt-4 text-base sm:text-lg text-gray-300 animate-fade-in-scroll">Découvrez notre communauté de coureurs passionnés et rejoignez-nous pour votre prochaine sortie.</p>
            </div>
            
            <div className="mt-8 flex justify-center animate-fade-in-scroll">
                 <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 space-y-6 max-w-lg w-full">
                    <h3 className="text-xl font-bold text-center">Contact Direct</h3>
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 justify-center sm:justify-start bg-white/5 p-3 rounded-lg border border-white/5">
                            <img src="https://i.postimg.cc/g0BPMqbT/IMG-5155-3.jpg" alt="Adrien" className="h-12 w-12 rounded-full object-cover border-2 border-[#00AFED]" />
                            <div><p className="text-base font-semibold text-white">Adrien</p><p className="text-sm text-gray-400">07 69 23 04 55</p></div>
                        </div>
                         <div className="flex items-center gap-4 justify-center sm:justify-start bg-white/5 p-3 rounded-lg border border-white/5">
                            <img src="https://i.postimg.cc/jj2pJwnN/0-2433-18344-98-11303698-t6c-Hnr.jpg" alt="Vincent" className="h-12 w-12 rounded-full object-cover border-2 border-[#00AFED]" />
                            <div><p className="text-base font-semibold text-white">Vincent</p><p className="text-sm text-gray-400">07 69 94 04 96</p></div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex flex-col gap-4">
                        <a href="https://chat.whatsapp.com/K6s9q2yMEYwL5Vk349Zx4J" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full px-6 py-3 text-base font-semibold text-white rounded-full bg-green-500/80 transition-colors hover:bg-green-500">
                           <WhatsAppIcon /> Rejoindre le groupe WhatsApp
                        </a>
                        <a href="https://www.facebook.com/groups/481948624640982/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full px-6 py-3 text-base font-semibold text-white rounded-full bg-blue-600/80 transition-colors hover:bg-blue-600">
                            <FacebookIcon /> Suivre sur Facebook
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>
);


const LandingPage: React.FC<{ onAuthRequest: () => void }> = ({ onAuthRequest }) => {
    useScrollAnimation();
  return (
    <main className="pt-16">
      <HeroSection onAuthRequest={onAuthRequest}/>
      <ClubInfoSection />
      <section id="generator-promo" className="py-16 bg-gradient-to-b from-transparent via-black/20 to-transparent text-center">
         <div className="container mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">Votre Plan d'Entraînement Évolutif</h2>
            <p className="text-xl text-center text-gray-300 mb-8 max-w-4xl mx-auto">Un programme sur-mesure, conçu par IA, qui s'adapte à votre profil, vos chronos et vos disponibilités pour vous faire atteindre vos objectifs.</p>
             <button onClick={onAuthRequest} className="px-8 py-4 text-xl font-semibold text-white rounded-full bg-[#00AFED] transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#00AFED]/50 glow-shadow-hover">
                Commencer et créer mon compte
            </button>
         </div>
      </section>
      <GallerySection />
      <PartnerSection />
      <ContactSection />
    </main>
  );
};

export default LandingPage;
