CREATE TABLE employees (
    id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    teacher_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    password TEXT NOT NULL
);


///subject TABLE

//student TABLE

CREATE TABLE public.students (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    index_number VARCHAR(30) NOT NULL UNIQUE,
    student_name VARCHAR(150) NOT NULL,

    class_id BIGINT NOT NULL
        REFERENCES public.class_divisions(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
