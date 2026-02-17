// Operational Transformation (OT) Library
// Handles collaborative text editing with conflict resolution

class OT {
    // Transform two operations against each other
    // op1: Operation to transform
    // op2: Operation to transform against
    // Returns transformed op1
    static transform(op1, op2) {
        if (!op1 || !op2) return op1;
        
        // Clone the operation to avoid mutation
        let transformedOp = { ...op1 };
        
        // Handle different operation type combinations
        if (op1.type === 'insert' && op2.type === 'insert') {
            transformedOp = OT.transformInsertInsert(op1, op2);
        } else if (op1.type === 'delete' && op2.type === 'delete') {
            transformedOp = OT.transformDeleteDelete(op1, op2);
        } else if (op1.type === 'insert' && op2.type === 'delete') {
            transformedOp = OT.transformInsertDelete(op1, op2);
        } else if (op1.type === 'delete' && op2.type === 'insert') {
            transformedOp = OT.transformDeleteInsert(op1, op2);
        } else if (op1.type === 'replace' || op2.type === 'replace') {
            transformedOp = OT.transformWithReplace(op1, op2);
        }
        
        // Ensure position is never negative
        if (transformedOp.position < 0) {
            transformedOp.position = 0;
        }
        
        return transformedOp;
    }
    
    // Transform insert against insert
    static transformInsertInsert(op1, op2) {
        let transformedOp = { ...op1 };
        
        if (op2.position <= op1.position) {
            // op2 inserts before op1, adjust op1's position
            transformedOp.position = op1.position + op2.content.length;
        }
        // If op2 inserts after op1, no transformation needed
        
        return transformedOp;
    }
    
    // Transform delete against delete
    static transformDeleteDelete(op1, op2) {
        let transformedOp = { ...op1 };
        
        const op1End = op1.position + op1.content.length;
        const op2End = op2.position + op2.content.length;
        
        if (op2End <= op1.position) {
            // op2 deletes completely before op1
            transformedOp.position = Math.max(0, op1.position - op2.content.length);
        } else if (op2.position >= op1End) {
            // op2 deletes completely after op1, no transformation needed
        } else {
            // Overlapping deletes - complex case
            if (op2.position <= op1.position && op2End >= op1End) {
                // op2 completely contains op1's deletion range
                transformedOp.type = 'noop'; // No-op, already deleted
                transformedOp.content = '';
            } else if (op2.position > op1.position && op2End < op1End) {
                // op1 completely contains op2's deletion range
                transformedOp.content = op1.content.substring(0, op2.position - op1.position) + 
                                       op1.content.substring(op2End - op1.position);
            } else {
                // Partial overlap - adjust the deletion
                const overlapStart = Math.max(op1.position, op2.position);
                const overlapEnd = Math.min(op1End, op2End);
                
                if (op2.position <= op1.position) {
                    // op2 starts before op1, overlaps at the beginning
                    transformedOp.position = op2.position;
                    transformedOp.content = op1.content.substring(overlapEnd - op1.position);
                } else {
                    // op2 starts after op1, overlaps at the end
                    transformedOp.content = op1.content.substring(0, op2.position - op1.position);
                }
            }
        }
        
        return transformedOp;
    }
    
    // Transform insert against delete
    static transformInsertDelete(op1, op2) {
        let transformedOp = { ...op1 };
        
        const op2End = op2.position + op2.content.length;
        
        if (op2End <= op1.position) {
            // Delete happens before insert, adjust insert position
            transformedOp.position = Math.max(0, op1.position - op2.content.length);
        } else if (op2.position > op1.position) {
            // Delete happens after insert, no transformation needed
        } else {
            // Delete range contains insert position
            // Insert at the beginning of the deleted range
            transformedOp.position = op2.position;
        }
        
        return transformedOp;
    }
    
    // Transform delete against insert
    static transformDeleteInsert(op1, op2) {
        let transformedOp = { ...op1 };
        
        const op1End = op1.position + op1.content.length;
        
        if (op2.position <= op1.position) {
            // Insert happens before delete, adjust delete position
            transformedOp.position = op1.position + op2.content.length;
        } else if (op2.position >= op1End) {
            // Insert happens after delete, no transformation needed
        } else {
            // Insert happens within delete range
            // Split the delete operation
            const beforeInsert = op1.content.substring(0, op2.position - op1.position);
            const afterInsert = op1.content.substring(op2.position - op1.position);
            
            // For simplicity, we'll extend the delete to include the inserted content
            // In a more sophisticated system, this might create multiple operations
            transformedOp.content = beforeInsert + op2.content + afterInsert;
        }
        
        return transformedOp;
    }
    
    // Transform operations involving replace
    static transformWithReplace(op1, op2) {
        // Replace operations are complex; for simplicity, we'll treat them as delete + insert
        if (op1.type === 'replace') {
            // Convert replace to delete + insert operations
            const deleteOp = {
                type: 'delete',
                position: op1.position,
                content: op1.removed || '',
                timestamp: op1.timestamp
            };
            
            const insertOp = {
                type: 'insert',
                position: op1.position,
                content: op1.content,
                timestamp: op1.timestamp + 1 // Ensure order
            };
            
            // Transform both operations
            const transformedDelete = OT.transform(deleteOp, op2);
            const transformedInsert = OT.transform(insertOp, op2);
            
            // Combine back into replace
            return {
                ...op1,
                type: 'replace',
                position: transformedDelete.position,
                content: transformedInsert.content,
                removed: transformedDelete.content
            };
        } else if (op2.type === 'replace') {
            // Transform op1 against op2's replace operation
            const deleteOp2 = {
                type: 'delete',
                position: op2.position,
                content: op2.removed || '',
                timestamp: op2.timestamp
            };
            
            const insertOp2 = {
                type: 'insert',
                position: op2.position,
                content: op2.content,
                timestamp: op2.timestamp + 1
            };
            
            // First transform against delete, then against insert
            let transformed = OT.transform(op1, deleteOp2);
            transformed = OT.transform(transformed, insertOp2);
            
            return transformed;
        }
        
        return op1;
    }
    
    // Apply operation to text
    static applyOperation(text, operation) {
        if (!operation || operation.type === 'noop') {
            return text;
        }
        
        const pos = Math.max(0, Math.min(operation.position, text.length));
        
        switch (operation.type) {
            case 'insert':
                return text.substring(0, pos) + operation.content + text.substring(pos);
                
            case 'delete':
                const deleteEnd = Math.min(pos + operation.content.length, text.length);
                return text.substring(0, pos) + text.substring(deleteEnd);
                
            case 'replace':
                const replaceEnd = Math.min(pos + (operation.removed?.length || 0), text.length);
                return text.substring(0, pos) + operation.content + text.substring(replaceEnd);
                
            default:
                console.warn('Unknown operation type:', operation.type);
                return text;
        }
    }
    
    // Validate operation
    static isValidOperation(operation) {
        if (!operation || typeof operation !== 'object') {
            return false;
        }
        
        const requiredFields = ['type', 'position'];
        for (const field of requiredFields) {
            if (!(field in operation)) {
                return false;
            }
        }
        
        if (typeof operation.position !== 'number' || operation.position < 0) {
            return false;
        }
        
        const validTypes = ['insert', 'delete', 'replace', 'noop'];
        if (!validTypes.includes(operation.type)) {
            return false;
        }
        
        if ((operation.type === 'insert' || operation.type === 'delete') && 
            typeof operation.content !== 'string') {
            return false;
        }
        
        if (operation.type === 'replace' && 
            (typeof operation.content !== 'string' || typeof operation.removed !== 'string')) {
            return false;
        }
        
        return true;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OT;
} else {
    window.OT = OT;
}