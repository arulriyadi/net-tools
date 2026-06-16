"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export const INCREMENTAL_LIST_PAGE_SIZE = 20

export function useIncrementalList<T>(
  items: T[],
  pageSize = INCREMENTAL_LIST_PAGE_SIZE,
) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const itemsLength = items.length

  useEffect(() => {
    setVisibleCount(pageSize)
    scrollRootRef.current?.scrollTo({ top: 0 })
  }, [items, pageSize])

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  )

  const hasMore = visibleCount < itemsLength

  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + pageSize, itemsLength))
  }, [itemsLength, pageSize])

  useEffect(() => {
    const root = scrollRootRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { root, rootMargin: "160px", threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore, visibleCount])

  useEffect(() => {
    const root = scrollRootRef.current
    if (!root || !hasMore) return

    const onScroll = () => {
      const remaining = root.scrollHeight - root.scrollTop - root.clientHeight
      if (remaining < 120) loadMore()
    }

    root.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => root.removeEventListener("scroll", onScroll)
  }, [hasMore, loadMore, visibleCount])

  const ensureVisibleCount = useCallback((minimum: number) => {
    setVisibleCount((current) => Math.max(current, Math.min(minimum, itemsLength)))
  }, [itemsLength])

  return {
    visibleItems,
    visibleCount: visibleItems.length,
    total: itemsLength,
    hasMore,
    scrollRootRef,
    sentinelRef,
    loadMore,
    ensureVisibleCount,
  }
}
