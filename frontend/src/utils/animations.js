import { useState, useEffect, useRef } from "react";

// Common animation variants
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.4 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

export const slideUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      type: "spring", 
      damping: 25, 
      stiffness: 500 
    }
  },
  exit: { 
    y: 20, 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export const slideRight = {
  hidden: { x: -20, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { 
      type: "spring", 
      damping: 25, 
      stiffness: 500 
    }
  }
};

export const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const growWidth = {
  hidden: { width: 0, opacity: 0 },
  visible: { 
    width: "100%", 
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

export const pulse = {
  hidden: { scale: 1 },
  visible: { 
    scale: [1, 1.05, 1],
    transition: { 
      repeat: Infinity, 
      repeatType: "loop", 
      duration: 2 
    }
  }
};

// Custom hooks for animations
export const useHoverAnimation = () => {
  const [hover, setHover] = useState(false);
  
  return {
    hover,
    handleHover: () => setHover(true),
    handleHoverEnd: () => setHover(false),
    animation: {
      scale: hover ? 1.05 : 1,
      transition: { duration: 0.2 }
    }
  };
};

export const useScrollAnimation = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      if (ref.current) {
        observer.disconnect();
      }
    };
  }, [threshold]);
  
  return {
    ref,
    animation: isVisible ? "visible" : "hidden"
  };
};

// Glowing border effect
export const GlowingBorder = {
  hidden: { 
    boxShadow: "0 0 0 rgba(99, 102, 241, 0)" 
  },
  visible: { 
    boxShadow: [
      "0 0 0 rgba(99, 102, 241, 0)",
      "0 0 8px rgba(99, 102, 241, 0.6)",
      "0 0 0 rgba(99, 102, 241, 0)"
    ],
    transition: { 
      repeat: Infinity, 
      duration: 2 
    }
  }
};

// Load indicator animation for buttons
export const loadingButton = {
  rest: { 
    scale: 1
  },
  loading: { 
    scale: [1, 0.95, 1],
    transition: { 
      repeat: Infinity, 
      duration: 0.8 
    }
  }
};