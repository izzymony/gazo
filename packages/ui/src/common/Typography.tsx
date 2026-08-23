import React from 'react'

const H1 = ({children, className} : { className: string, children: React.ReactNode }) => {
  return (
    <p className={`font-medium text-h1 text-center text-ink-90 tracking-[0px] ${className}`}>{children}</p>
  )
}

export default H1