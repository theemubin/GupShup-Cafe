import React, { useEffect, useRef, useState } from 'react';
import './HeroSection.css';

const images = [
  new URL('../assets/hero1.jpg', import.meta.url).href,
  new URL('../assets/hero2.jpg', import.meta.url).href,
  new URL('../assets/hero3.jpg', import.meta.url).href,
  new URL('../assets/hero4.jpg', import.meta.url).href,
  new URL('../assets/hero5.jpg', import.meta.url).href,
  new URL('../assets/hero6.jpg', import.meta.url).href,
  new URL('../assets/hero7.jpg', import.meta.url).href,
  new URL('../assets/hero8.jpg', import.meta.url).href,
  new URL('../assets/hero9.jpg', import.meta.url).href,
];

export const HeroSection = () => {
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [fade, setFade] = useState(false);
  const [showBg, setShowBg] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    timeoutRef.current = window.setTimeout(() => {
      setPrevIndex(index);
      setFade(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % images.length);
        setFade(false);
      }, 3500); // match CSS transition
    }, 8000);
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line
  }, [index]);


  const handleClick = () => setShowBg(true);
  const handleCarouselClick = (_src: string, i: number) => {
    setIndex(i % images.length);
    setShowBg(true);
  };

  return (
    <section className="hero-section" onClick={handleClick}>
      <div
        className={`hero-bg${showBg ? ' show-bg' : ''}`}
        style={{
          backgroundImage: `url(${images[index]})`,
          opacity: fade ? 0 : showBg ? 0.85 : 0.5,
          zIndex: 1,
        }}
      />
      {fade && (
        <div
          className={`hero-bg${showBg ? ' show-bg' : ''}`}
          style={{
            backgroundImage: `url(${images[prevIndex]})`,
            opacity: showBg ? 0.85 : 0.5,
            zIndex: 0,
          }}
        />
      )}
      <div className="hero-content hero-content-hoverable">
        <h1>Efforts Build Outcomes.</h1>
        <p>Track your efforts, values, and house spirit here. Every step counts.</p>
        <div className="hero-motivation-box">
          <span className="hero-quote-icon" aria-hidden="true">&#10077;</span>
          <span className="hero-motivation-text">
            Here, we celebrate your efforts, values, and the spirit you bring every day. Whether you're helping a friend, practicing English, or showing up with honesty and courage,every small action counts.<br /><br />
            Growth isn’t just about results, it’s about consistency, resilience, and community. This space exists to recognize those who try, who care, and who keep going.<br /><br />
            Keep believing in your journey. Your efforts today are shaping a better tomorrow, for you and everyone around you.
          </span>
        </div>
      </div>
      <div className="hero-carousel">
        <div className="carousel-track">
          {[...images, ...images, ...images].map((src, i) => (
            <img
              src={src}
              alt="carousel"
              className={`carousel-img${index === i % images.length ? ' active' : ''}`}
              key={i}
              draggable={false}
              onClick={e => { e.stopPropagation(); handleCarouselClick(src, i); }}
            />
          ))}
        </div>
      </div>
      {/* No fullscreen modal, clicking carousel sets main background */}
    </section>
  );
};
