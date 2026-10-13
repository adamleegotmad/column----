export type Gender = 'male' | 'female'

export type ProfileType = 'alumni' | 'company' | 'lab' | 'club' | 'department'

/** 学位层级：本科生/硕士生/博士生/博士后/其他 */
export type Degree = 'undergrad' | 'master' | 'doctor' | 'postdoc' | 'other'

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
  /** 学位层级 */
  degree: Degree | null
  /** 校友的毕业年份（分开存储，避免与「入学年份」混淆；在校生可留空） */
  graduation_time: string | null
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

/** 热词（话题标签），mention_count 为被提及次数 */
export interface Topic {
  id: string
  name: string
  mention_count: number
}