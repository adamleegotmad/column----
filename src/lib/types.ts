export type Gender = 'male' | 'female'

export type ProfileType = 'alumni' | 'company' | 'lab' | 'club' | 'department'

/** 在校/校友 判定模式：auto=按入学年份自动，alumni=强制校友，student=强制在校 */
export type AlumniMode = 'auto' | 'alumni' | 'student'

export interface Profile {
  id: string
  username: string | null
  full_name: string
  nickname: string | null
  real_name: string | null
  gender: Gender | null
  show_real_name: boolean
  avatar: string | null
  school: string | null
  /** 入学年份（纯数字年份，如 2023；语义从「毕业年份」改为「入学年份」） */
  graduation_year: string | null
  is_alumni: boolean
  alumni_mode: AlumniMode
  profile_type: ProfileType | null
  bio: string | null
  favorites_public: boolean
}

export interface Post {
  id: string
  author_id: string
  body: string
  image_url: string | null
  like_count: number
  comment_count: number
  share_count: number
  created_at: string
  author?: Profile | null
  topics?: Topic[]
  /** 当前用户是否已点赞（由前端查询填充） */
  liked_by_me?: boolean
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  body: string
  created_at: string
  author?: Profile | null
}

export interface Favorite {
  post_id: string
  user_id: string
  created_at: string
  /** 收藏的帖子（由查询填充） */
  post?: Post | null
}

export interface Topic {
  id: string
  name: string
  post_count: number
}

export interface Event {
  id: string
  title: string
  location: string
  start_at: string
  description: string | null
}