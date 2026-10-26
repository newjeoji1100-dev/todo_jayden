export type MediaType = 'photo' | 'video' | 'interview'
export type Filter = 'all' | 'photo' | 'video' | '2470' | '70200'

export interface ShootTodo {
  id: number
  sequence: number
  section: string
  title: string
  detail: string
  media_type: MediaType
  camera_tag: '2470' | '70200'
  is_required: boolean
  completed: boolean
  created_at: string
  updated_at: string
}

export const mediaLabel: Record<MediaType, string> = {
  photo: '사진',
  video: '영상',
  interview: '인터뷰',
}
