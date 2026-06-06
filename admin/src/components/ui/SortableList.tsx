'use client';
// SortableList — liste réordonnable par glisser-déposer (dnd-kit).
// Générique : rend chaque item via une render-prop et appelle onReorder(ids)
// avec le nouvel ordre des identifiants après un déplacement.
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';

interface HasId { id: string }

interface SortableListProps<T extends HasId> {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T) => ReactNode;
  /** Désactive le glisser-déposer (ex. pendant une édition en ligne) */
  disabled?: boolean;
  className?: string;
}

function SortableRow({ id, disabled, children }: { id: string; disabled?: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        type="button"
        className={`mt-1 shrink-0 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing ${disabled ? 'pointer-events-none opacity-40' : ''}`}
        aria-label="Déplacer"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function SortableList<T extends HasId>({ items, onReorder, renderItem, disabled, className }: SortableListProps<T>) {
  // Ordre local optimiste pour un retour visuel immédiat
  const [order, setOrder] = useState<T[]>(items);
  useEffect(() => { setOrder(items); }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex(i => i.id === active.id);
    const newIndex = order.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    onReorder(next.map(i => i.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className={className || 'space-y-3'}>
          {order.map(item => (
            <SortableRow key={item.id} id={item.id} disabled={disabled}>
              {renderItem(item)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default SortableList;
