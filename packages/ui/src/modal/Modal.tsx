import Image from 'next/image';
import React from 'react';
import H1 from '../common/Typography';
import Button from '../common/Button';
import Dialog from '../common/Dialog';

interface ModalProps {
  imageSrc?: string;
  imageAlt?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonAction?: () => void;
  onClose?: () => void;
  children?: React.ReactNode;
}

/**
 * Content modal (image / title / description / action). Built on the canonical
 * Dialog (W3.5) — parent renders it conditionally, so it's always "open" while
 * mounted. Same props API; gains focus-trap / Escape / scroll-lock / aria.
 */
export const Modal: React.FC<ModalProps> = ({
  imageSrc,
  imageAlt,
  title,
  description,
  buttonText,
  buttonAction,
  children,
  onClose,
}: ModalProps) => {
  return (
    <Dialog
      isOpen
      onClose={onClose ?? (() => {})}
      ariaLabel={title}
      className="rounded-card lg:rounded-3xl p-5 lg:p-8"
    >
      <div className="flex flex-col gap-5 items-center">
        {imageSrc && imageAlt && (
          <Image src={imageSrc} alt={imageAlt} width={0} height={0} className="w-auto h-auto" />
        )}

        <div className="text-center">
          <H1 className="text-h2 mb-1 leading-[22px]">{title}</H1>
          <p className="text-foreground-secondary">{description}</p>
        </div>

        {children}

        {buttonAction && buttonText && (
          <Button onClick={buttonAction} className="mt-[0px]">
            {buttonText}
          </Button>
        )}
      </div>
    </Dialog>
  );
};
