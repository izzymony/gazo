import {  useState } from 'react';

export const useScroll = (threshold: number) => {
    const [isScrolled, setIsScrolled] = useState(false);

    const handleScroll = (event: Event) => {
        const target = event.target as HTMLElement;
        if (target.scrollTop > threshold) {
            setIsScrolled(true);
        } else {
            setIsScrolled(false);
        }
    };

    const addScrollListener = (ref: React.RefObject<HTMLDivElement>) => {
        const currentRef = ref.current;
        if (currentRef) {
            currentRef.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (currentRef) {
                currentRef.removeEventListener('scroll', handleScroll);
            }
        };
    };

    return { isScrolled, addScrollListener };
};

export default useScroll; 