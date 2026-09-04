import React from "react";

type ArrowProps = React.SVGProps<SVGSVGElement>

const Arrow: React.FC<ArrowProps> = (props) => {    return (
        <svg width="13" height="14" viewBox="0 0 13 14" fill="none" xmlns="http://www.w3.org/2000/svg"
        {...props}>
        <path d="M12.4987 7H0.831991M0.831991 7L6.66532 1.16667M0.831991 7L6.66532 12.8333"  strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12.4987 7H0.831991M0.831991 7L6.66532 1.16667M0.831991 7L6.66532 12.8333"  strokeOpacity="0.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        
    );
}

export default Arrow;