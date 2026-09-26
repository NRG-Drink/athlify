import { Box, Container, Flex, Link } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { paths } from '../navigation/paths'
import { MobileNav } from './MobileNav'
import { PrimaryNav } from './PrimaryNav'
import { UserMenu } from './UserMenu'

export function AppHeader() {
  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      zIndex="sticky"
      borderBottomWidth="1px"
      bg="bg.panel/80"
      backdropFilter="blur(8px)"
    >
      <Container maxW="7xl">
        <Flex h="16" align="center" gap={{ base: '2', md: '8' }}>
          <MobileNav />
          <Link
            asChild
            display="flex"
            alignItems="center"
            gap="2"
            fontWeight="bold"
            fontSize="1.125rem"
            letterSpacing="-0.02em"
            color="fg"
            textDecoration="none"
            focusRing="outside"
            _hover={{ textDecoration: 'none' }}
          >
            <RouterLink to={paths.dashboard}>
              <BrandMark boxSize="7" />
              Athlify
            </RouterLink>
          </Link>
          <PrimaryNav />
          <Box ms="auto">
            <UserMenu />
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}
