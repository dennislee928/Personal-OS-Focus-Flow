/**
 * Drag and Drop Ordering Component - Handles task reordering with drag-and-drop
 */

export interface DragDropConfig {
  container: HTMLElement;
  itemSelector: string;
  handleSelector?: string;
  dragClass?: string;
  dropZoneClass?: string;
  placeholderClass?: string;
  enableTouch?: boolean;
  enableKeyboard?: boolean;
  onReorder?: (fromIndex: number, toIndex: number, itemId: string) => void;
  onDragStart?: (itemId: string, index: number) => void;
  onDragEnd?: (itemId: string, index: number) => void;
}

export interface DragDropState {
  isDragging: boolean;
  draggedItem: HTMLElement | null;
  draggedIndex: number;
  dropIndex: number;
  placeholder: HTMLElement | null;
}

export class DragDropOrdering {
  private config: DragDropConfig;
  private state: DragDropState;
  private touchStartPos: { x: number; y: number } | null = null;
  private keyboardFocusIndex: number = -1;
  private longPressTimer: number | null = null;
  private longPressDelay: number = 500; // ms

  constructor(config: DragDropConfig) {
    this.config = {
      dragClass: 'dragging',
      dropZoneClass: 'drop-zone',
      placeholderClass: 'drag-placeholder',
      enableTouch: true,
      enableKeyboard: true,
      ...config
    };

    this.state = {
      isDragging: false,
      draggedItem: null,
      draggedIndex: -1,
      dropIndex: -1,
      placeholder: null
    };

    this.initialize();
  }

  /**
   * Initialize drag and drop functionality
   */
  private initialize(): void {
    this.setupMouseEvents();
    
    if (this.config.enableTouch) {
      this.setupTouchEvents();
    }
    
    if (this.config.enableKeyboard) {
      this.setupKeyboardEvents();
    }

    this.createPlaceholder();
  }

  /**
   * Refresh the drag-drop setup (call when items change)
   */
  refresh(): void {
    this.setupMouseEvents();
  }

  /**
   * Destroy the drag-drop functionality
   */
  destroy(): void {
    this.cancelLongPress();
    
    this.config.container.removeEventListener('mousedown', this.handleMouseDown);
    this.config.container.removeEventListener('touchstart', this.handleTouchStart);
    this.config.container.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('touchmove', this.handleTouchMoveEarly);
    document.removeEventListener('touchend', this.handleTouchEndEarly);
  }

  private setupMouseEvents(): void {
    // Remove existing listeners
    this.config.container.removeEventListener('mousedown', this.handleMouseDown);
    
    // Add new listeners
    this.config.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
  }

  private setupTouchEvents(): void {
    this.config.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
  }

  private setupKeyboardEvents(): void {
    this.config.container.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const item = this.findDraggableItem(e.target as HTMLElement);
    if (!item) return;

    // Check if we clicked on the handle (if specified)
    if (this.config.handleSelector) {
      const handle = (e.target as HTMLElement).closest(this.config.handleSelector);
      if (!handle || !item.contains(handle)) return;
    }

    e.preventDefault();
    this.startDrag(item, e.clientX, e.clientY);

    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.state.isDragging) return;
    
    e.preventDefault();
    this.updateDragPosition(e.clientX, e.clientY);
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (this.state.isDragging) {
      this.endDrag();
    }

    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const item = this.findDraggableItem(touch.target as HTMLElement);
    if (!item) return;

    // Check if we touched the handle (if specified)
    if (this.config.handleSelector) {
      const handle = (touch.target as HTMLElement).closest(this.config.handleSelector);
      if (!handle || !item.contains(handle)) return;
    }

    // Store initial touch position for gesture detection
    this.touchStartPos = { x: touch.clientX, y: touch.clientY };

    // Add visual feedback for touch
    item.classList.add('touch-active');

    // Start long press timer for drag initiation
    this.longPressTimer = window.setTimeout(() => {
      if (this.touchStartPos) {
        // Provide haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
        
        e.preventDefault();
        this.startDrag(item, touch.clientX, touch.clientY);
        
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd);
      }
    }, this.longPressDelay);

    // Add temporary listeners for canceling long press
    document.addEventListener('touchmove', this.handleTouchMoveEarly, { passive: false });
    document.addEventListener('touchend', this.handleTouchEndEarly);
  };

  private handleTouchMoveEarly = (e: TouchEvent): void => {
    if (!this.touchStartPos || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - this.touchStartPos.y);

    // Cancel long press if user moves too much (likely scrolling)
    if (deltaX > 10 || deltaY > 10) {
      this.cancelLongPress();
    }
  };

  private handleTouchEndEarly = (): void => {
    this.cancelLongPress();
  };

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Remove touch feedback
    const items = this.getDraggableItems();
    items.forEach(item => item.classList.remove('touch-active'));

    // Remove early listeners
    document.removeEventListener('touchmove', this.handleTouchMoveEarly);
    document.removeEventListener('touchend', this.handleTouchEndEarly);

    this.touchStartPos = null;
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.state.isDragging || e.touches.length !== 1) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    this.updateDragPosition(touch.clientX, touch.clientY);
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    this.cancelLongPress();
    
    if (this.state.isDragging) {
      this.endDrag();
    }

    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const items = this.getDraggableItems();
    if (items.length === 0) return;

    const focusedItem = document.activeElement as HTMLElement;
    const currentIndex = Array.from(items).indexOf(focusedItem.closest(this.config.itemSelector) as HTMLElement);

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          // Move item up
          if (currentIndex > 0) {
            this.moveItem(currentIndex, currentIndex - 1);
          }
        } else {
          // Focus previous item
          this.focusItem(Math.max(0, currentIndex - 1));
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          // Move item down
          if (currentIndex < items.length - 1) {
            this.moveItem(currentIndex, currentIndex + 1);
          }
        } else {
          // Focus next item
          this.focusItem(Math.min(items.length - 1, currentIndex + 1));
        }
        break;

      case 'Home':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          // Move to top
          if (currentIndex > 0) {
            this.moveItem(currentIndex, 0);
          }
        }
        break;

      case 'End':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          // Move to bottom
          if (currentIndex < items.length - 1) {
            this.moveItem(currentIndex, items.length - 1);
          }
        }
        break;
    }
  };

  private findDraggableItem(element: HTMLElement): HTMLElement | null {
    return element.closest(this.config.itemSelector) as HTMLElement;
  }

  private getDraggableItems(): NodeListOf<HTMLElement> {
    return this.config.container.querySelectorAll(this.config.itemSelector);
  }

  private getItemId(item: HTMLElement): string {
    return item.dataset.taskId || item.dataset.itemId || item.id || '';
  }

  private getItemIndex(item: HTMLElement): number {
    const items = this.getDraggableItems();
    return Array.from(items).indexOf(item);
  }

  private startDrag(item: HTMLElement, x: number, y: number): void {
    this.state.isDragging = true;
    this.state.draggedItem = item;
    this.state.draggedIndex = this.getItemIndex(item);

    // Add dragging class and visual feedback
    item.classList.add(this.config.dragClass!);
    item.classList.remove('touch-active');
    
    // Add drop zone class to container
    this.config.container.classList.add(this.config.dropZoneClass!);

    // Add visual indicators to all items
    this.addDragVisualIndicators();

    // Insert placeholder
    if (this.state.placeholder) {
      item.parentNode?.insertBefore(this.state.placeholder, item.nextSibling);
      this.updatePlaceholderContent();
    }

    // Set initial drag position for visual feedback
    this.updateDragVisualPosition(item, x, y);

    // Notify drag start
    this.config.onDragStart?.(this.getItemId(item), this.state.draggedIndex);
  }

  private addDragVisualIndicators(): void {
    const items = this.getDraggableItems();
    items.forEach((item, index) => {
      if (item !== this.state.draggedItem) {
        item.classList.add('drag-target');
        
        // Add position indicators
        const positionIndicator = document.createElement('div');
        positionIndicator.className = 'position-indicator';
        positionIndicator.textContent = `${index + 1}`;
        item.appendChild(positionIndicator);
      }
    });
  }

  private removeDragVisualIndicators(): void {
    const items = this.getDraggableItems();
    items.forEach(item => {
      item.classList.remove('drag-target', 'drag-over');
      
      // Remove position indicators
      const indicator = item.querySelector('.position-indicator');
      if (indicator) {
        indicator.remove();
      }
    });
  }

  private updateDragVisualPosition(item: HTMLElement, x: number, y: number): void {
    // Add visual drag feedback (could be used for custom drag ghost)
    item.style.transform = `translate(${x - item.offsetLeft}px, ${y - item.offsetTop}px)`;
    item.style.zIndex = '1000';
  }

  private updatePlaceholderContent(): void {
    if (!this.state.placeholder || !this.state.draggedItem) return;

    const draggedIndex = this.state.draggedIndex;
    const newIndex = this.getPlaceholderIndex();
    
    this.state.placeholder.innerHTML = `
      <div class="placeholder-content">
        <div class="placeholder-text">Drop here</div>
        <div class="placeholder-position">Position ${newIndex + 1}</div>
        <div class="placeholder-change">
          ${newIndex !== draggedIndex ? 
            `Moving from ${draggedIndex + 1} to ${newIndex + 1}` : 
            'No change'
          }
        </div>
      </div>
    `;
  }

  private getPlaceholderIndex(): number {
    if (!this.state.placeholder) return -1;
    
    const items = Array.from(this.config.container.children);
    return items.indexOf(this.state.placeholder);
  }

  private updateDragPosition(x: number, y: number): void {
    if (!this.state.draggedItem || !this.state.placeholder) return;

    // Update visual position of dragged item
    this.updateDragVisualPosition(this.state.draggedItem, x, y);

    // Find the item under the cursor
    const elementBelow = document.elementFromPoint(x, y);
    const targetItem = elementBelow ? this.findDraggableItem(elementBelow as HTMLElement) : null;

    // Remove previous drag-over indicators
    const items = this.getDraggableItems();
    items.forEach(item => item.classList.remove('drag-over'));

    if (targetItem && targetItem !== this.state.draggedItem) {
      const targetIndex = this.getItemIndex(targetItem);
      const draggedIndex = this.getItemIndex(this.state.draggedItem);

      // Add drag-over visual feedback
      targetItem.classList.add('drag-over');

      // Determine insertion point
      const rect = targetItem.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const insertAfter = y > midpoint;

      // Move placeholder
      if (insertAfter) {
        targetItem.parentNode?.insertBefore(this.state.placeholder, targetItem.nextSibling);
      } else {
        targetItem.parentNode?.insertBefore(this.state.placeholder, targetItem);
      }

      this.state.dropIndex = insertAfter ? targetIndex + 1 : targetIndex;
      
      // Adjust for the dragged item's current position
      if (this.state.dropIndex > draggedIndex) {
        this.state.dropIndex--;
      }

      // Update placeholder content with new position info
      this.updatePlaceholderContent();
    }
  }

  private endDrag(): void {
    if (!this.state.draggedItem || !this.state.isDragging) return;

    const draggedItem = this.state.draggedItem;
    const fromIndex = this.state.draggedIndex;
    let toIndex = this.state.dropIndex;

    // Remove dragging classes and reset visual state
    draggedItem.classList.remove(this.config.dragClass!);
    draggedItem.style.transform = '';
    draggedItem.style.zIndex = '';
    
    this.config.container.classList.remove(this.config.dropZoneClass!);

    // Remove all visual indicators
    this.removeDragVisualIndicators();

    // Move the actual item if position changed
    if (toIndex >= 0 && toIndex !== fromIndex && this.state.placeholder) {
      this.state.placeholder.parentNode?.insertBefore(draggedItem, this.state.placeholder);
      
      // Recalculate final index
      toIndex = this.getItemIndex(draggedItem);
      
      // Add success animation
      draggedItem.classList.add('drop-success');
      setTimeout(() => {
        draggedItem.classList.remove('drop-success');
      }, 300);
      
      // Notify reorder
      this.config.onReorder?.(fromIndex, toIndex, this.getItemId(draggedItem));
    } else {
      // Add cancel animation if no change
      draggedItem.classList.add('drop-cancel');
      setTimeout(() => {
        draggedItem.classList.remove('drop-cancel');
      }, 200);
    }

    // Remove placeholder
    if (this.state.placeholder && this.state.placeholder.parentNode) {
      this.state.placeholder.parentNode.removeChild(this.state.placeholder);
    }

    // Notify drag end
    this.config.onDragEnd?.(this.getItemId(draggedItem), toIndex >= 0 ? toIndex : fromIndex);

    // Reset state
    this.state.isDragging = false;
    this.state.draggedItem = null;
    this.state.draggedIndex = -1;
    this.state.dropIndex = -1;
  }

  private moveItem(fromIndex: number, toIndex: number): void {
    const items = this.getDraggableItems();
    if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
      return;
    }

    const item = items[fromIndex];
    const targetItem = items[toIndex];
    const itemId = this.getItemId(item);

    // Add keyboard move animation
    item.classList.add('keyboard-moving');
    
    // Move DOM element
    if (toIndex > fromIndex) {
      targetItem.parentNode?.insertBefore(item, targetItem.nextSibling);
    } else {
      targetItem.parentNode?.insertBefore(item, targetItem);
    }

    // Remove animation class after animation completes
    setTimeout(() => {
      item.classList.remove('keyboard-moving');
    }, 200);

    // Focus the moved item
    this.focusItem(toIndex);

    // Provide audio feedback for accessibility
    this.announceMove(fromIndex + 1, toIndex + 1);

    // Notify reorder
    this.config.onReorder?.(fromIndex, toIndex, itemId);
  }

  private announceMove(fromPosition: number, toPosition: number): void {
    // Create accessible announcement for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Task moved from position ${fromPosition} to position ${toPosition}`;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  private focusItem(index: number): void {
    const items = this.getDraggableItems();
    if (index >= 0 && index < items.length) {
      const item = items[index];
      
      // Remove previous keyboard focus indicators
      items.forEach(i => i.classList.remove('keyboard-focused'));
      
      // Add keyboard focus indicator
      item.classList.add('keyboard-focused');
      item.focus();
      this.keyboardFocusIndex = index;

      // Scroll into view if needed
      item.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }

  private createPlaceholder(): void {
    this.state.placeholder = document.createElement('div');
    this.state.placeholder.className = this.config.placeholderClass!;
    this.state.placeholder.innerHTML = `
      <div class="placeholder-content">
        <div class="placeholder-icon">⬇</div>
        <div class="placeholder-text">Drop here</div>
        <div class="placeholder-position"></div>
        <div class="placeholder-change"></div>
      </div>
    `;
    
    // Add accessibility attributes
    this.state.placeholder.setAttribute('role', 'region');
    this.state.placeholder.setAttribute('aria-label', 'Drop zone for reordering tasks');
  }
}