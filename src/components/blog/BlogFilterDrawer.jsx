import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import BlogSidebar from './BlogSidebar'

function BlogFilterDrawer({ categories = [], tags = [], posts = [], isOpen, setIsOpen }) {
  return (
    <>
      {/* Floating Filter Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-40 sm:hidden"
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-12 w-12 p-0 shadow-lg"
        >
          <Filter className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 sm:hidden"
          />
        )}
      </AnimatePresence>

      {/* Drawer Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-background border-r border-border z-50 overflow-y-auto p-4 sm:hidden"
          >
            <BlogSidebar
              categories={categories}
              tags={tags}
              posts={posts}
              onClose={() => setIsOpen(false)}
              isMobile
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default memo(BlogFilterDrawer)
