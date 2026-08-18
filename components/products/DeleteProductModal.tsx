"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface DeleteProductModalProps {
  open: boolean;
  productName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteProductModal({
  open,
  productName,
  loading,
  onConfirm,
  onCancel,
}: DeleteProductModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Delete product"
      description={`Are you sure you want to delete "${productName}"? This action cannot be undone.`}
    >
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          loading={loading}
          className="bg-red-600 hover:bg-red-700 active:bg-red-800"
        >
          Delete product
        </Button>
      </div>
    </Modal>
  );
}
