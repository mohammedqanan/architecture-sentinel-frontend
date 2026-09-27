/**
 * src/lib/react-utils.ts
 *
 * React utility helpers for advanced ref patterns.
 * ============================================================
 *
 * 🎯 الغرض:
 *   توفير أدوات آمنة للتعامل مع React refs في React 18 و 19،
 *   حيث أصبح `RefObject.current` readonly في React 19.
 *
 * 🏗️ الأنماط المُطبقة:
 *   - Callback Ref normalization
 *   - MutableRefObject casting (compatible مع 18 + 19)
 *   - Merge refs (combining local + forwarded)
 *   - Stable callback pattern
 *   - Cleanup support (React 19 callback ref cleanup)
 *
 * 🎨 فلسفة التصميم:
 *   هذا الملف هو "الأساس الهندسي" (Engineering Foundation) الذي
 *   يدعم نظام "Obsidian & Ember" البصري. تماماً كما يحتاج المبنى
 *   إلى أساسات فولاذية قبل أن تُوضع الأحجار الكريمة على واجهته،
 *   يحتاج Design System بصري إلى utilities قوية تدعمه.
 *
 * ✅ التوافق:
 *   - React 18 (current is mutable)
 *   - React 19 (current is readonly → cast to mutable)
 *
 * @example
 * ```tsx
 * const localRef = useRef<HTMLDivElement>(null);
 * const mergedRef = useMergeRefs(localRef, forwardedRef);
 * return <div ref={mergedRef}>...</div>;
 * ```
 */

import {
  useCallback,
  useMemo,
  useRef,
  type ForwardedRef,
  type MutableRefObject,
  type Ref,
} from 'react';

// ============================================================
// 1. assignRef — Universal ref assignment
// ============================================================

/**
 * Assigns a value to a ref safely.
 *
 * يدعم جميع أنواع refs:
 *   - Callback refs: `(node) => void`
 *   - RefObject (from useRef): `{ current: T | null }`
 *   - ForwardedRef: `<T>(instance: T | null) => void`
 *   - null/undefined (no-op)
 *
 * ✅ Compatible with React 18 and React 19.
 * ✅ Handles callback ref cleanup (React 19 feature).
 *
 * @param ref   - Ref to assign to
 * @param value - Value to assign (or null to clear)
 *
 * @example
 * ```tsx
 * // Callback ref
 * assignRef((node) => console.log(node), divElement);
 *
 * // RefObject
 * const ref = useRef<HTMLDivElement>(null);
 * assignRef(ref, divElement);  // ref.current = divElement
 *
 * // Null-safe
 * assignRef(null, divElement);  // no-op
 * ```
 */
export function assignRef<T>(
  ref: Ref<T> | ForwardedRef<T> | undefined | null,
  value: T | null
): void {
  if (!ref) return;

  if (typeof ref === 'function') {
    // ✅ Callback ref (React 19 supports returning cleanup fn, ignore)
    ref(value);
  } else {
    // ✅ RefObject — cast to MutableRefObject to bypass React 19's readonly
    (ref as MutableRefObject<T | null>).current = value;
  }
}

// ============================================================
// 2. useMergeRefs — Merge multiple refs into one
// ============================================================

/**
 * Merges multiple refs into a single callback ref.
 *
 * ✅ Stable reference — يعيد إنشاء الدالة فقط عند تغيير الـ refs.
 * ✅ Correctly handles the spread-array pitfall.
 *
 * @param refs - Array of refs to merge
 * @returns A callback ref that assigns to all provided refs
 *
 * @example
 * ```tsx
 * const localRef = useRef<HTMLDivElement>(null);
 * const mergedRef = useMergeRefs(localRef, forwardedRef);
 * return <div ref={mergedRef}>...</div>;
 * ```
 */
export function useMergeRefs<T>(
  ...refs: Array<Ref<T> | ForwardedRef<T> | undefined | null>
): (node: T | null) => void {
  // ✅ نُصلّح المشكلة: نُخزّن refs في useRef للحصول على reference مستقر
  const refsRef = useRef(refs);
  refsRef.current = refs;

  return useCallback((node: T | null) => {
    refsRef.current.forEach((ref) => assignRef(ref, node));
  }, []); // ✅ dependencies فارغة لأننا نستخدم refsRef
}

// ============================================================
// 3. useStableCallback — Stable callback pattern
// ============================================================

/**
 * Returns a stable callback that always calls the latest version of `fn`.
 *
 * ✅ مفيد عندما تحتاج callback مستقر (للـ event listeners)
 *    لكن لا تريد مشاكل stale closures.
 *
 * @param fn - The callback function
 * @returns A stable callback wrapper
 *
 * @example
 * ```tsx
 * const handleResize = useStableCallback(() => {
 *   console.log(window.innerWidth, someState);
 * });
 *
 * useEffect(() => {
 *   window.addEventListener('resize', handleResize);
 *   return () => window.removeEventListener('resize', handleResize);
 * }, [handleResize]);  // ✅ handleResize is stable
 * ```
 */
export function useStableCallback<Args extends unknown[], R>(
  fn: (...args: Args) => R
): (...args: Args) => R {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useMemo(
    () =>
      (...args: Args): R =>
        fnRef.current(...args),
    []
  );
}

// ============================================================
// 4. mergeRefs (non-hook version) — Utility for class components
// ============================================================

/**
 * Non-hook version of useMergeRefs.
 * Useful outside of React components (e.g., in custom hooks or utilities).
 *
 * @param refs - Array of refs to merge
 * @returns A callback ref that assigns to all provided refs
 *
 * @example
 * ```tsx
 * const mergedRef = mergeRefs(localRef, forwardedRef);
 * <div ref={mergedRef} />
 * ```
 */
export function mergeRefs<T>(
  ...refs: Array<Ref<T> | ForwardedRef<T> | undefined | null>
): (node: T | null) => void {
  return (node: T | null) => {
    refs.forEach((ref) => assignRef(ref, node));
  };
}